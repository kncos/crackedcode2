import { CrackedError, indentStr } from "cracked-lib";
import z from "zod";
import { NodeHandlerResult, produceCode } from "..";
import {
  collectInnerNodes,
  CONTAINER_TYPE,
  hasArrayInner,
  hasFunctionInner,
  isContainer,
  isPrimitive,
  isRefNode,
  zn,
  ZN_LIKE,
} from "../../nodes";
import { TypeGraph } from "../../typegraph";
import { cppContainerMap, cppPrimitiveMap } from "./records";

const cppHandleNode = (input: ZN_LIKE): NodeHandlerResult => {
  if (isRefNode(input)) {
    return { typeRef: input._ref };
  } else if (isPrimitive(input)) {
    const typeName = cppPrimitiveMap[input._type];
    return {
      typeRef: input._name ?? `${typeName}`,
      emit: input._name ? `using ${input._name} = ${typeName};` : undefined,
    };
  } else if (isContainer(input)) {
    const inner = collectInnerNodes(input)
      .map((node) => cppHandleNode(node)!.typeRef)
      .join(", ");

    const actualType = cppContainerMap[input._type as CONTAINER_TYPE](inner);
    return {
      typeRef: input._name ?? actualType,
      emit: input._name ? `using ${input._name} = ${actualType};` : undefined,
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
      emit: [
        `struct ${input._name} {`,
        ...entries.map(({ propName, ref }) => indentStr(`${ref} ${propName};`)),
        `};`,
      ].join("\n"),
    };
  } else if (input._type === "function") {
    // mainly just for linting
    if (!hasFunctionInner(input)) {
      throw new CrackedError("PARSE_ERROR", {
        message: "espected function inner on function type node",
      });
    }

    const { _in, _out } = input._inner;
    const params = Object.entries(_in ?? {})
      .map(([name, node]) => `${cppHandleNode(node).typeRef} ${name}`)
      .join(", ");
    const paramNames = Object.keys(_in ?? {}).join(", ");
    const returnType = _out ? cppHandleNode(_out).typeRef : "void";
    const signature = `${returnType} ${input._name!}(${params})`;

    return {
      typeRef: input._name!,
      driver_emit: `${signature};`,
      user_emit: `${signature} {\n\n}`,
      driver_internal:
        `static ${signature} {\n` +
        `  return ::${input._name!}(${paramNames});\n` +
        `}\n`,
    };
  } else if (input._type === "entry") {
    if (!hasArrayInner(input)) {
      throw new CrackedError("PARSE_ERROR", {
        message: "expected array inner on entry type node",
      });
    }

    const driver_impls = input._inner
      .map(cppHandleNode)
      .map((n) => n.driver_internal)
      .filter((v) => v !== undefined);

    const ops_name = "Operations";

    const ops =
      `struct ${ops_name} {\n` + indentStr(driver_impls.join("\n")) + "\n};\n";
    const body = [
      `bool driver(std::string_view json) {`,
      `  bool success = test_runner::run<${ops_name}>(json);`,
      `  return success;`,
      `}`,
    ].join("\n");

    return {
      typeRef: "// SHOULD NOT SEE THIS",
      driver_emit: ops + body,
    };
  }

  throw new CrackedError("PARSE_ERROR", {
    message: "unknown node type encountered",
  });
};

export const cppHandler = (
  graph: TypeGraph<z.infer<typeof zn>>,
): {
  user: string;
  driver: string;
} => {
  const dependencies = graph.topologicalSort();

  const nodeResults = [];

  for (const dep of dependencies) {
    const node = graph.getNode(dep)!;
    const handlerResult = cppHandleNode(node);
    nodeResults.push(handlerResult);
  }

  return produceCode(nodeResults);
};
