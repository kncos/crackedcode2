import { describe, expect, test } from "vitest";
import { cppHandler } from "../handlers/cpp";
import { parseSchema } from "../typegraph";

describe("typegraph testing", () => {
  test("one node", () => {
    const nodes = {
      _type: "entry",
      _inner: [
        {
          _type: "i32",
          _name: "some_int",
        },
      ],
    };

    const graph = parseSchema(nodes);
    const dependencyOrder = graph.topologicalSort();
    expect(dependencyOrder).toEqual(["some_int", "entry"]);
  });

  test("two node", () => {
    const nodes = {
      _type: "entry",
      _inner: [
        {
          _type: "u16",
          _name: "port_t",
        },
        {
          _type: "string",
          _name: "host_t",
        },
      ],
    };

    const deps = parseSchema(nodes).topologicalSort();
    expect(deps).toEqual(["port_t", "host_t", "entry"]);
  });

  test("basic order resolution", () => {
    const nodes = {
      _type: "entry",
      _inner: [
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
      ],
    };

    const deps = parseSchema(nodes).topologicalSort();
    expect(deps).toEqual(["flag_t", "flags_t", "entry"]);
  });

  test("nested definition", () => {
    const nodes = {
      _type: "entry",
      _inner: [
        {
          _type: "array",
          _name: "flags_t",
          _inner: {
            _type: "i8",
            _name: "flag_t",
          },
        },
      ],
    };

    const deps = parseSchema(nodes).topologicalSort();
    expect(deps).toEqual(["flag_t", "flags_t", "entry"]);
  });

  test("code generation", () => {
    const nodes = {
      _type: "entry",
      _inner: [
        {
          _type: "array",
          _name: "numsArr",
          _inner: {
            _type: "i64",
          },
        },
        {
          _type: "function",
          _name: "twoSum",
          _inner: {
            _in: {
              nums: {
                _type: "ref",
                _ref: "numsArr",
              },
              target: {
                _type: "i64",
              },
            },
            _out: {
              _type: "ref",
              _ref: "numsArr",
            },
          },
        },
      ],
    };

    const deps = parseSchema(nodes);
    const cpp = cppHandler(deps);
    console.log("// driver.cpp\n" + cpp.driver);
    console.log("// user.cpp\n" + cpp.user);
  });
});
