import { CrackedError } from "cracked-lib";
import z from "zod";
import {
  collectInnerNodes,
  isNonPrimitive,
  isRefNode,
  zn,
  ZN_LIKE,
  znEntry,
} from "./nodes";

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

export const parseSchema = (input: ZN_LIKE) => {
  const graph = new TypeGraph<z.infer<typeof zn>>();

  const stack: string[] = [];
  const parseNode = (n: ZN_LIKE) => {
    const parsed = zn.safeParse(n);
    if (!parsed.success) {
      console.log(JSON.stringify(n, null, 2));
    }

    const node = zn.parse(n);

    // Check if this is a ref node (has _ref property)
    if (isRefNode(node)) {
      // Refs are just pointers, don't process them further
      return;
    }

    const name = node._name;

    // Only add named nodes to the graph
    if (name) {
      if (graph.getNode(name)) {
        throw new Error(
          `[Parse Error] Attempted to redefine node with name ${name}.`,
        );
      }

      graph.addNode(name, node);
      stack.push(name);
    }

    // initial parse will transform node to supply _collectDeps

    // handle nested nodes
    if (isNonPrimitive(node)) {
      const innerNodes = collectInnerNodes(node);
      // parse all inner nodes
      innerNodes.forEach(parseNode);
      // for each inner node, handle dependencies
      innerNodes.forEach((child) => {
        const dependencyName = isRefNode(child) ? child._ref : child._name;

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

  const parsedRoot = znEntry.safeParse(input);
  if (!parsedRoot.success) {
    throw new CrackedError("PARSE_ERROR", {
      message:
        "Root node must be a valid 'entry' type node.\n" +
        z.prettifyError(parsedRoot.error),
    });
  }

  parseNode(parsedRoot.data);

  if (graph.hasCycle()) {
    throw new Error("[PARSE ERROR] Cyclical reference found on schema.");
  }
  if (graph.hasUndefinedRef()) {
    throw new Error("[PARSE ERROR] Undefined reference found on schema.");
  }

  return graph;
};
