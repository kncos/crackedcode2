import { CrackedError, indentStr } from "cracked-lib";
import z from "zod";
import { NodeHandlerResult } from "..";
import {
  collectInnerNodes,
  CONTAINER_TYPE,
  hasFunctionInner,
  isContainer,
  isPrimitive,
  isRefNode,
  zn,
  ZN_LIKE,
} from "../../nodes";
import { TypeGraph } from "../../typegraph";
import { applySlashComment } from "../../utils";
import { cppContainerMap, cppPrimitiveMap } from "./records";

const cppHandleNode = (input: ZN_LIKE): NodeHandlerResult => {
  if (isRefNode(input)) {
    return { typeRef: input._ref };
  } else if (isPrimitive(input)) {
    const typeName = cppPrimitiveMap[input._type];
    return {
      typeRef: input._name ?? `${typeName}`,
      typeDef: input._name ? `using ${input._name} = ${typeName};` : undefined,
      doc: applySlashComment(input._desc),
    };
  } else if (isContainer(input)) {
    const inner = collectInnerNodes(input)
      .map((node) => cppHandleNode(node)!.typeRef)
      .join(", ");

    const actualType = cppContainerMap[input._type as CONTAINER_TYPE](inner);
    return {
      typeRef: input._name ?? actualType,
      typeDef: input._name
        ? `using ${input._name} = ${actualType};`
        : undefined,
    };
  } else if (input._type === "object") {
    const entries = Object.entries(input._inner as object).map(
      ([propName, node]) => ({
        propName,
        ref: cppHandleNode(node),
      }),
    );
    return {
      typeRef: input._name!,
      typeDef: [
        `struct ${input._name} {`,
        ...entries.map(({ propName, ref }) => indentStr(`${ref} ${propName};`)),
        `};`,
      ].join("\n"),
    };
  } else if (input._type === "function") {
    // mainly just for linting
    if (!hasFunctionInner(input)) {
      throw new CrackedError("PARSE_ERROR", {
        message: "espected function inner",
      });
    }

    const { _in, _out } = input._inner;
    const params = Object.entries(_in ?? {})
      .map(([name, node]) => `${name}: ${cppHandleNode(node).typeRef}`)
      .join(", ");
    const returnType = _out ? cppHandleNode(_out) : "void";
    const signature = `${returnType} ${input._name!}(${params})`;

    return {
      typeRef: input._name!,
      dec: `${signature};`,
      impl: `${signature} {\n\n}`,
    };
  }

  throw new CrackedError("PARSE_ERROR", {
    message: "unknown node type encountered",
  });
};

export const cppHandler = (graph: TypeGraph<z.infer<typeof zn>>) => {
  const dependencies = graph.topologicalSort();

  const results = [];

  for (const dep of dependencies) {
    const node = graph.getNode(dep)!;
    results.push(cppHandleNode(node));
  }

  return results;
};
