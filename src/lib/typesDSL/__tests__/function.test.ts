import { assert, describe, expect, test } from "vitest";
import { getBuiltinRegistry } from "../builtins";
import { parseSchema } from "../parser";

describe("builtin function zod", () => {
  // Functions produce z.never() for their own zData — they are declarations only.
  // However, resolving a function node must still populate the refmap for any
  // named parameter / return types so that downstream refs work correctly.

  test("function zData is z.never()", () => {
    const input = [
      {
        _type: "function",
        _name: "add",
        _inner: {
          _in: {
            a: { _type: "i32" },
            b: { _type: "i32" },
          },
          _out: { _type: "i32" },
        },
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const { zData } = languageResolvers.zod(graph.getNode("add")!, new Map());

    // z.never() rejects every value
    expect(zData.safeParse(0).success).toBe(false);
    expect(zData.safeParse("").success).toBe(false);
    expect(zData.safeParse(null).success).toBe(false);
    expect(zData.safeParse(undefined).success).toBe(false);
    expect(zData.safeParse({}).success).toBe(false);
  });

  test("function with no params and no return type", () => {
    const input = [
      {
        _type: "function",
        _name: "noop",
        _inner: {},
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const { zData } = languageResolvers.zod(graph.getNode("noop")!, new Map());
    expect(zData.safeParse(undefined).success).toBe(false);
  });

  test("function is registered in refmap under its name", () => {
    const input = [
      {
        _type: "function",
        _name: "greet",
        _inner: {
          _in: { name: { _type: "string" } },
          _out: { _type: "string" },
        },
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const refmap = new Map();
    languageResolvers.zod(graph.getNode("greet")!, refmap);

    assert.isTrue(refmap.has("greet"), "function name should be in refmap");
    // The stored schema should also be z.never()
    const stored = refmap.get("greet")!;
    expect(stored.safeParse("anything").success).toBe(false);
  });

  test("named param/return types are expanded into refmap during resolution", () => {
    // If _in or _out nodes are named, resolving the function should call
    // callHandler on them, which populates the refmap for those names.
    const input = [
      {
        _type: "function",
        _name: "transform",
        _inner: {
          _in: {
            value: { _type: "i32", _name: "InputValue" },
          },
          _out: { _type: "string", _name: "OutputValue" },
        },
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const refmap = new Map();
    languageResolvers.zod(graph.getNode("transform")!, refmap);

    // The function handler calls callHandler on each param and the return type,
    // so named nodes among them should appear in the refmap.
    assert.isTrue(
      refmap.has("InputValue"),
      "named param type should be in refmap",
    );
    assert.isTrue(
      refmap.has("OutputValue"),
      "named return type should be in refmap",
    );

    // Verify the stored schemas are correct
    const inputSchema = refmap.get("InputValue")!;
    assert.isTrue(inputSchema.safeParse(0).success);
    expect(inputSchema.safeParse("not an int").success).toBe(false);

    const outputSchema = refmap.get("OutputValue")!;
    assert.isTrue(outputSchema.safeParse("result").success);
    expect(outputSchema.safeParse(42).success).toBe(false);
  });
});
