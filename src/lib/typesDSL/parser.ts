import z, { ZodDiscriminatedUnion } from 'zod';
import { TypeSchema } from './codec';
import { NodeLike, zNodeLike } from './utils';

export type ExtractTypeGraphType<T> = T extends TypeGraph<infer U> ? U : never;

export class TypeGraph<NodeT> {
  private nodes = new Map<string, NodeT>();
  // used for dependency ordering; we can add dependencies even when the referential
  // chain is broken with something like a pointer or unnamed node in between
  private dependencies = new Map<string, Set<string>>();
  // used for cycle detection. we can keep track of direct "hard" dependencies but
  // not add relationships when it is broken by something like a pointer
  private directDependencies = new Map<string, Set<string>>();

  addNode = (name: string, node: NodeT): void => {
    this.nodes.set(name, node);
    if (!this.dependencies.has(name)) {
      this.dependencies.set(name, new Set());
    }
    if (!this.directDependencies.has(name)) {
      this.directDependencies.set(name, new Set());
    }
  };

  addDependency = (from: string, to: string): void => {
    if (!this.dependencies.has(from)) {
      this.dependencies.set(from, new Set());
    }
    this.dependencies.get(from)!.add(to);
  };

  addDirectReference = (from: string, to: string): void => {
    if (!this.directDependencies.has(from)) {
      this.directDependencies.set(from, new Set());
    }
    this.directDependencies.get(from)!.add(to);
  };

  getNode = (name: string): NodeT | undefined => {
    return this.nodes.get(name);
  };

  hasCycle = (): boolean => {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (node: string): boolean => {
      if (visiting.has(node)) {
        return true;
      } else if (visited.has(node)) {
        return false;
      }
      visiting.add(node);
      const deps = this.directDependencies.get(node) || new Set();
      for (const dep of deps) {
        if (dfs(dep)) {
          return true;
        }
      }

      visiting.delete(node);
      visited.add(node);
      return false;
    };

    for (const node of this.nodes.keys()) {
      if (!visited.has(node) && dfs(node)) {
        return true;
      }
    }
    return false;
  };

  hasUndefinedRef = (): boolean => {
    for (const deps of this.dependencies.values()) {
      for (const dep of deps) {
        if (!this.nodes.has(dep)) {
          return true;
        }
      }
    }
    return false;
  };

  topologicalSort = (): string[] => {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (node: string): void => {
      if (visited.has(node)) {
        return;
      }
      visited.add(node);
      const deps = this.dependencies.get(node) || new Set();

      for (const dep of deps) {
        dfs(dep);
      }

      result.push(node);
    };

    for (const node of this.nodes.keys()) {
      dfs(node);
    }

    return result;
  };
}

const zWithInner = zNodeLike.extend({
  _inner: z.unknown(),
  _collectDeps: z.function({
    input: [],
    output: z.array(zNodeLike),
  }),
});

export const parseSchema = <
  T extends ZodDiscriminatedUnion<[TypeSchema, ...TypeSchema[]]>,
>(params: {
  input: NodeLike[];
  readonly types: T;
}) => {
  const { input, types } = params;
  const graph = new TypeGraph<z.infer<typeof types>>();

  if (types === undefined) {
    throw new Error('[PARSE ERROR] undefined types schema.');
  }

  const stack: string[] = [];
  const parseNode = (n: NodeLike) => {
    const parsed = types.safeParse(n);
    if (!parsed.success) {
      console.log(JSON.stringify(n, null, 2));
    }

    const node = types.parse(n);
    const name = node._name;

    // Check if this is a ref node (has _ref property)
    const refResult = z.string().nonempty().safeParse(node._ref);

    // Refs should not have names and should not be added to the graph
    if (refResult.success) {
      if (name) {
        throw new Error(
          '[Parse Error] Encountered a node with both _name and _ref, cannot resolve dependency.',
        );
      }
      // Refs are just pointers, don't process them further
      return;
    }

    // Only add named nodes to the graph
    if (name) {
      if (graph.getNode(name)) {
        throw new Error(`[Parse Error] Attempted to redefine node with name ${name}.`);
      }

      graph.addNode(name, node);
      stack.push(name);
    }

    // initial parse will transform node to supply _collectDeps
    const withInner = zWithInner.safeParse(node);
    // handle nested nodes
    if (withInner.success) {
      const innerNodes = withInner.data._collectDeps();
      // parse all inner nodes
      innerNodes.forEach(parseNode);
      // for each inner node, handle dependencies
      innerNodes.forEach((child) => {
        const childName = child._name;
        const childRefResult = z.string().nonempty().safeParse(child._ref);
        if (childName && childRefResult.success) {
          throw new Error(
            '[Parse Error] Encountered a node with both _name and _ref, cannot resolve dependency.',
          );
        }
        const dependencyName = childName ?? childRefResult.data;
        if (!dependencyName) return;
        // add dependency even through indirection for correct dependency ordering
        if (stack.length !== 0) {
          graph.addDependency(stack[stack.length - 1], dependencyName);
        }
        // add direct reference for cycle detection if this is a named node
        if (node._name) {
          graph.addDirectReference(node._name, dependencyName);
        }
      });
    }

    if (name) {
      stack.pop();
    }
  };

  for (const root of input) {
    const parsedRoot = zNodeLike.safeParse(root);
    if (!parsedRoot.success) {
      // console.log(JSON.stringify(root, null, 2));
      throw new Error('[PARSE ERROR] Failed to parse root node. is it NodeLike?', {
        cause: parsedRoot.error,
      });
    }

    if (!parsedRoot.data._name) {
      throw new Error('[PARSE ERROR] Root node must have a name!');
    }

    // Parse through the full typed schema so that defaults (e.g. _disallowRoot)
    // are applied before we inspect the node.
    const fullyParsed = types.safeParse(root);
    if (fullyParsed.success && (fullyParsed.data as Record<string, unknown>)._disallowRoot) {
      throw new Error('[PARSE ERROR] node with _disallowRoot found as root node.');
    }

    parseNode(parsedRoot.data);
  }

  if (graph.hasCycle()) {
    throw new Error('[PARSE ERROR] Cyclical reference found on schema.');
  }
  if (graph.hasUndefinedRef()) {
    throw new Error('[PARSE ERROR] Undefined reference found on schema.');
  }

  return graph as TypeGraph<z.infer<T>>;
};
