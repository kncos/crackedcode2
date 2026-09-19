import { NodeLike } from "@/lib/typesDSL/utils";
import { assert, describe, expect, test } from "vitest";
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

const addSubInput = [
  {
    _type: "multiCaller",
    _name: "testSuite",
    _inner: {
      addOut: {
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
      subOut: {
        _type: "singleCaller",
        _name: "subCaller",
        _inner: {
          _type: "function",
          _name: "sub",
          _inner: {
            _in: { a: { _type: "i32" }, b: { _type: "i32" } },
            _out: { _type: "i32" },
          },
        },
      },
    },
  },
];

describe("multiCaller zod", () => {
  test("accepts a single function call", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isTrue(
      zData.safeParse({ data: [{ fn: "add", a: 2, b: 3, expect: 5 }] }).success,
    );
    assert.isTrue(
      zData.safeParse({ data: [{ fn: "sub", a: 10, b: 3, expect: 7 }] })
        .success,
    );
  });

  test("accepts multiple calls to the same function", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isTrue(
      zData.safeParse({
        data: [
          { fn: "add", a: 1, b: 2, expect: 3 },
          { fn: "add", a: 10, b: 20, expect: 30 },
        ],
      }).success,
    );
  });

  test("accepts mixed function calls", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isTrue(
      zData.safeParse({
        data: [
          { fn: "add", a: 2, b: 3, expect: 5 },
          { fn: "sub", a: 10, b: 3, expect: 7 },
        ],
      }).success,
    );
  });

  test("accepts storage key references in place of literal values", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isTrue(
      zData.safeParse({
        data: [
          { fn: "add", a: 2, b: 3, expect: 5 },
          { fn: "add", a: 10, b: { _storageKey: "addOut" }, expect: 15 },
        ],
      }).success,
    );
    assert.isTrue(
      zData.safeParse({
        data: [
          { fn: "sub", a: 10, b: 3, expect: 7 },
          { fn: "sub", a: 20, b: { _storageKey: "subOut" }, expect: 13 },
        ],
      }).success,
    );
  });

  test("accepts cross-function storage key references", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isTrue(
      zData.safeParse({
        data: [
          { fn: "add", a: 2, b: 3, expect: 5 },
          { fn: "sub", a: 10, b: 3, expect: 7 },
          {
            fn: "add",
            a: { _storageKey: "subOut" },
            b: { _storageKey: "addOut" },
            expect: 12,
          },
        ],
      }).success,
    );
  });

  test("accepts optional storage initialisation", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isTrue(
      zData.safeParse({
        storage: { addOut: 100 },
        data: [
          { fn: "sub", a: 200, b: { _storageKey: "addOut" }, expect: 100 },
        ],
      }).success,
    );
  });

  test("rejects invalid storage keys", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isFalse(
      zData.safeParse({
        storage: { notAKey: 42 },
        data: [{ fn: "add", a: 1, b: 2, expect: 3 }],
      }).success,
      "unknown storage key should be rejected",
    );
  });

  test("rejects unknown fn discriminant", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isFalse(
      zData.safeParse({ data: [{ fn: "multiply", a: 2, b: 3, expect: 6 }] })
        .success,
    );
  });

  test("rejects missing fn discriminant", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isFalse(
      zData.safeParse({ data: [{ a: 2, b: 3, expect: 5 }] }).success,
    );
  });

  test("rejects wrong argument types", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isFalse(
      zData.safeParse({ data: [{ fn: "add", a: "two", b: 3, expect: 5 }] })
        .success,
    );
  });

  test("rejects invalid _storageKey value", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isFalse(
      zData.safeParse({
        data: [{ fn: "add", a: { _storageKey: "notAKey" }, b: 3, expect: 5 }],
      }).success,
    );
  });

  test("data array must be present", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    assert.isFalse(zData.safeParse({}).success);
    assert.isFalse(zData.safeParse({ storage: {} }).success);
  });

  test("comprehensive chained storage sequence", () => {
    const zData = buildRefMap(addSubInput).get("testSuite")!;

    const cases = [
      {
        data: [
          { fn: "add", a: 100, b: 200, expect: 300 },
          { fn: "sub", a: 1000, b: { _storageKey: "addOut" }, expect: 700 },
        ],
      },
      {
        data: [
          { fn: "sub", a: 5, b: 10, expect: -5 },
          { fn: "sub", a: 0, b: { _storageKey: "subOut" }, expect: 5 },
        ],
      },
      {
        data: [
          { fn: "add", a: 0, b: 0, expect: 0 },
          { fn: "sub", a: 0, b: { _storageKey: "addOut" }, expect: 0 },
        ],
      },
      {
        data: [
          { fn: "sub", a: 50, b: 25, expect: 25 },
          { fn: "add", a: { _storageKey: "subOut" }, b: 75, expect: 100 },
          {
            fn: "sub",
            a: { _storageKey: "addOut" },
            b: { _storageKey: "subOut" },
            expect: 75,
          },
        ],
      },
      {
        data: [
          { fn: "add", a: -10, b: -5, expect: -15 },
          { fn: "sub", a: 0, b: { _storageKey: "addOut" }, expect: 15 },
        ],
      },
    ];

    for (const c of cases) {
      expect(zData.safeParse(c).success).toBe(true);
    }
  });
});
