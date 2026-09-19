import { assert, describe, test } from "vitest";
import { getBuiltinRegistry } from "../builtins";
import { parseSchema } from "../parser";

describe("builtin primitives zod", () => {
  test("integers - valid bounds", () => {
    const integerTests = [
      {
        id: "i8",
        input: [{ _type: "i8", _name: "i8" }],
        min: -128n,
        max: 127n,
      },
      { id: "u8", input: [{ _type: "u8", _name: "u8" }], min: 0n, max: 255n },
      {
        id: "i16",
        input: [{ _type: "i16", _name: "i16" }],
        min: -32768n,
        max: 32767n,
      },
      {
        id: "u16",
        input: [{ _type: "u16", _name: "u16" }],
        min: 0n,
        max: 65535n,
      },
      {
        id: "i32",
        input: [{ _type: "i32", _name: "i32" }],
        min: -2147483648n,
        max: 2147483647n,
      },
      {
        id: "u32",
        input: [{ _type: "u32", _name: "u32" }],
        min: 0n,
        max: 2n ** 32n - 1n,
      },
      {
        id: "i64",
        input: [{ _type: "i64", _name: "i64" }],
        min: -(2n ** 63n),
        max: 2n ** 63n - 1n,
      },
      {
        id: "u64",
        input: [{ _type: "u64", _name: "u64" }],
        min: 0n,
        max: 2n ** 64n - 1n,
      },
    ];

    for (const intTest of integerTests) {
      const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
      const graph = parseSchema({
        input: intTest.input,
        types: getAllTypesZodSchema(),
      });
      const schema = graph.getNode(intTest.id)!;
      const { zData } = languageResolvers.zod(schema, new Map());
      const minRes = zData.safeParse(intTest.min);
      const maxRes = zData.safeParse(intTest.max);
      assert.equal(minRes.data, intTest.min);
      assert.equal(maxRes.data, intTest.max);
    }
  });

  test("integers - out of bounds rejected", () => {
    // i8–u32 use zUnwrapBigint so they accept bigints but convert to number;
    // i64/u64 stay as bigint natively via z.int64()/z.uint64()
    const integerTests = [
      {
        id: "i8",
        input: [{ _type: "i8", _name: "i8" }],
        min: -128n,
        max: 127n,
      },
      { id: "u8", input: [{ _type: "u8", _name: "u8" }], min: 0n, max: 255n },
      {
        id: "i16",
        input: [{ _type: "i16", _name: "i16" }],
        min: -32768n,
        max: 32767n,
      },
      {
        id: "u16",
        input: [{ _type: "u16", _name: "u16" }],
        min: 0n,
        max: 65535n,
      },
      {
        id: "i32",
        input: [{ _type: "i32", _name: "i32" }],
        min: -2147483648n,
        max: 2147483647n,
      },
      {
        id: "u32",
        input: [{ _type: "u32", _name: "u32" }],
        min: 0n,
        max: 2n ** 32n - 1n,
      },
      {
        id: "i64",
        input: [{ _type: "i64", _name: "i64" }],
        min: -(2n ** 63n),
        max: 2n ** 63n - 1n,
      },
      {
        id: "u64",
        input: [{ _type: "u64", _name: "u64" }],
        min: 0n,
        max: 2n ** 64n - 1n,
      },
    ];

    for (const intTest of integerTests) {
      const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
      const graph = parseSchema({
        input: intTest.input,
        types: getAllTypesZodSchema(),
      });
      const schema = graph.getNode(intTest.id)!;
      const { zData } = languageResolvers.zod(schema, new Map());
      const belowMin = zData.safeParse(intTest.min - 1n);
      const aboveMax = zData.safeParse(intTest.max + 1n);
      assert.equal(
        belowMin.success,
        false,
        `${intTest.id}: expected min-1 to fail`,
      );
      assert.equal(
        aboveMax.success,
        false,
        `${intTest.id}: expected max+1 to fail`,
      );
    }
  });

  test("f64 - valid values", () => {
    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({
      input: [{ _type: "f64", _name: "f64" }],
      types: getAllTypesZodSchema(),
    });
    const schema = graph.getNode("f64")!;
    const { zData } = languageResolvers.zod(schema, new Map());

    // Basic finite values
    assert.equal(zData.safeParse(0).data, 0);
    assert.equal(zData.safeParse(1.5).data, 1.5);
    assert.equal(zData.safeParse(-1.5).data, -1.5);
    assert.equal(zData.safeParse(Number.MAX_VALUE).data, Number.MAX_VALUE);
    assert.equal(zData.safeParse(-Number.MAX_VALUE).data, -Number.MAX_VALUE);
  });

  test("f64 - precision loss past 2^53", () => {
    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({
      input: [{ _type: "f64", _name: "f64" }],
      types: getAllTypesZodSchema(),
    });
    const schema = graph.getNode("f64")!;
    const { zData } = languageResolvers.zod(schema, new Map());

    // At 2^52, incrementing by 1 is still representable
    const at52 = 2 ** 52;
    const at52plus1 = at52 + 1;
    assert.notEqual(
      at52,
      at52plus1,
      "sanity: 2^52 and 2^52+1 should be distinct numbers",
    );
    assert.equal(zData.safeParse(at52).data, at52);
    assert.equal(zData.safeParse(at52plus1).data, at52plus1);

    // Past 2^53, incrementing by 1 loses precision (rounds back to 2^53)
    const at53 = 2 ** 53;
    const at53plus1 = at53 + 1;
    assert.equal(
      at53,
      at53plus1,
      "sanity: 2^53 and 2^53+1 should be the same JS number due to precision loss",
    );
    assert.equal(zData.safeParse(at53).data, at53plus1); // they're the same value
  });

  test("f64 - NaN and Infinity rejected", () => {
    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({
      input: [{ _type: "f64", _name: "f64" }],
      types: getAllTypesZodSchema(),
    });
    const schema = graph.getNode("f64")!;
    const { zData } = languageResolvers.zod(schema, new Map());

    assert.equal(zData.safeParse(NaN).success, false, "NaN should be rejected");
    assert.equal(
      zData.safeParse(Infinity).success,
      false,
      "Infinity should be rejected",
    );
    assert.equal(
      zData.safeParse(-Infinity).success,
      false,
      "-Infinity should be rejected",
    );
  });

  test("bool - valid values", () => {
    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({
      input: [{ _type: "bool", _name: "bool" }],
      types: getAllTypesZodSchema(),
    });
    const schema = graph.getNode("bool")!;
    const { zData } = languageResolvers.zod(schema, new Map());

    assert.equal(zData.safeParse(true).data, true);
    assert.equal(zData.safeParse(false).data, false);
  });

  test("bool - non-boolean values rejected", () => {
    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({
      input: [{ _type: "bool", _name: "bool" }],
      types: getAllTypesZodSchema(),
    });
    const schema = graph.getNode("bool")!;
    const { zData } = languageResolvers.zod(schema, new Map());

    assert.equal(
      zData.safeParse(0).success,
      false,
      "0 should not be accepted as bool",
    );
    assert.equal(
      zData.safeParse(1).success,
      false,
      "1 should not be accepted as bool",
    );
    assert.equal(
      zData.safeParse("true").success,
      false,
      '"true" string should not be accepted as bool',
    );
    assert.equal(
      zData.safeParse(null).success,
      false,
      "null should not be accepted as bool",
    );
  });

  test("char - valid single character", () => {
    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({
      input: [{ _type: "char", _name: "char" }],
      types: getAllTypesZodSchema(),
    });
    const schema = graph.getNode("char")!;
    const { zData } = languageResolvers.zod(schema, new Map());

    assert.equal(zData.safeParse("a").data, "a");
    assert.equal(zData.safeParse("Z").data, "Z");
    assert.equal(zData.safeParse("!").data, "!");
    assert.equal(zData.safeParse("0").data, "0");
  });

  test("char - empty string and multi-char strings rejected", () => {
    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({
      input: [{ _type: "char", _name: "char" }],
      types: getAllTypesZodSchema(),
    });
    const schema = graph.getNode("char")!;
    const { zData } = languageResolvers.zod(schema, new Map());

    assert.equal(
      zData.safeParse("").success,
      false,
      "empty string should be rejected",
    );
    assert.equal(
      zData.safeParse("ab").success,
      false,
      "two-char string should be rejected",
    );
    assert.equal(
      zData.safeParse("hello").success,
      false,
      "multi-char string should be rejected",
    );
    assert.equal(
      zData.safeParse(65).success,
      false,
      "number should be rejected for char",
    );
  });

  test("string - valid values", () => {
    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({
      input: [{ _type: "string", _name: "string" }],
      types: getAllTypesZodSchema(),
    });
    const schema = graph.getNode("string")!;
    const { zData } = languageResolvers.zod(schema, new Map());

    assert.equal(zData.safeParse("").data, "");
    assert.equal(zData.safeParse("hello world").data, "hello world");
    assert.equal(zData.safeParse("a").data, "a");
    const longStr = "x".repeat(10000);
    assert.equal(zData.safeParse(longStr).data, longStr);
  });

  test("string - non-string values rejected", () => {
    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({
      input: [{ _type: "string", _name: "string" }],
      types: getAllTypesZodSchema(),
    });
    const schema = graph.getNode("string")!;
    const { zData } = languageResolvers.zod(schema, new Map());

    assert.equal(
      zData.safeParse(42).success,
      false,
      "number should be rejected",
    );
    assert.equal(
      zData.safeParse(true).success,
      false,
      "boolean should be rejected",
    );
    assert.equal(
      zData.safeParse(null).success,
      false,
      "null should be rejected",
    );
    assert.equal(
      zData.safeParse(undefined).success,
      false,
      "undefined should be rejected",
    );
    assert.equal(
      zData.safeParse([]).success,
      false,
      "array should be rejected",
    );
  });
});
