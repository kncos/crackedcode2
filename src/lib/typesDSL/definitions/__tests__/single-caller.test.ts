import { NodeLike } from "@/lib/typesDSL/utils";
import { assert, describe, test } from "vitest";
import { ZodType } from "zod";
import { getPlatformTypes } from "../..";
import { parseSchema } from "../../parser";

const buildRefMap = (input: NodeLike[]) => {
  const types = getPlatformTypes();
  const graph = parseSchema({ input, types: types.getAllTypesZodSchema() });
  const refMap = new Map<string, ZodType>();
  for (const dep of graph.topologicalSort()) {
    const schema = types.languageResolvers.zod(graph.getNode(dep)!, refMap);
    refMap.set(dep, schema.zData);
  }
  return refMap;
};

describe("singleCaller zod", () => {
  test("accepts valid call data with inputs and expected output", () => {
    const zData = buildRefMap([
      {
        _type: "singleCaller",
        _name: "addCaller",
        _inner: {
          _type: "function",
          _name: "add",
          _inner: {
            _in: { a: { _type: "i32" }, b: { _type: "i32" } },
            _out: { _type: "i32" },
          },
        },
      },
    ]).get("addCaller")!;

    assert.isTrue(zData.safeParse({ a: 1, b: 2, expect: 3 }).success);
    assert.isTrue(zData.safeParse({ a: -10, b: 10, expect: 0 }).success);
  });

  test("expect field is absent when function has no return type", () => {
    const zData = buildRefMap([
      {
        _type: "singleCaller",
        _name: "voidCaller",
        _inner: {
          _type: "function",
          _name: "doSomething",
          _inner: { _in: { x: { _type: "i32" } } },
        },
      },
    ]).get("voidCaller")!;

    assert.isTrue(zData.safeParse({ x: 42 }).success);
    assert.isFalse(
      zData.safeParse({ x: 42, expect: 0 }).success,
      "expect should not be accepted when fn is void",
    );
  });

  test("rejects missing required input fields", () => {
    const zData = buildRefMap([
      {
        _type: "singleCaller",
        _name: "addCaller",
        _inner: {
          _type: "function",
          _name: "add",
          _inner: {
            _in: { a: { _type: "i32" }, b: { _type: "i32" } },
            _out: { _type: "i32" },
          },
        },
      },
    ]).get("addCaller")!;

    assert.isFalse(zData.safeParse({ a: 1, expect: 3 }).success, "missing b");
    assert.isFalse(
      zData.safeParse({ expect: 3 }).success,
      "missing both inputs",
    );
  });

  test("rejects inputs of the wrong type", () => {
    const zData = buildRefMap([
      {
        _type: "singleCaller",
        _name: "addCaller",
        _inner: {
          _type: "function",
          _name: "add",
          _inner: {
            _in: { a: { _type: "i32" }, b: { _type: "i32" } },
            _out: { _type: "i32" },
          },
        },
      },
    ]).get("addCaller")!;

    assert.isFalse(zData.safeParse({ a: "one", b: 2, expect: 3 }).success);
    assert.isFalse(zData.safeParse({ a: 1, b: 2, expect: "three" }).success);
  });

  test("no-input no-output function accepts empty object", () => {
    const zData = buildRefMap([
      {
        _type: "singleCaller",
        _name: "noopCaller",
        _inner: {
          _type: "function",
          _name: "noop",
          _inner: {},
        },
      },
    ]).get("noopCaller")!;

    assert.isTrue(zData.safeParse({}).success);
  });
});
