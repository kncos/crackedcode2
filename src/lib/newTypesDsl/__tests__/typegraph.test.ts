import { describe, expect, test } from "vitest";
import { ZN_LIKE } from "../nodes";
import { parseSchema } from "../typegraph";

describe("typegraph testing", () => {
  test("one node", () => {
    const node = {
      _type: "i32",
      _name: "some_int",
    } satisfies ZN_LIKE;

    const graph = parseSchema([node]);
    const dependencyOrder = graph.topologicalSort();
    expect(dependencyOrder).toEqual(["some_int"]);
  });

  test("two node", () => {
    const nodes = [
      {
        _type: "u16",
        _name: "port_t",
      },
      {
        _type: "string",
        _name: "host_t",
      },
    ];

    const deps = parseSchema(nodes).topologicalSort();
    expect(deps).toEqual(["port_t", "host_t"]);
  });

  test("basic order resolution", () => {
    const nodes = [
      {
        _type: "array",
        _name: "flags_t",
        _inner: {
          _type: "ref",
          _ref: "flag_t",
        },
      },
      {
        _type: "i8",
        _name: "flag_t",
      },
    ];

    const deps = parseSchema(nodes).topologicalSort();
    expect(deps).toEqual(["flag_t", "flags_t"]);
  });

  test("nested definition", () => {
    const nodes = [
      {
        _type: "array",
        _name: "flags_t",
        _inner: {
          _type: "i8",
          _name: "flag_t",
        },
      },
    ];

    const deps = parseSchema(nodes).topologicalSort();
    expect(deps).toEqual(["flag_t", "flags_t"]);
  });
});
