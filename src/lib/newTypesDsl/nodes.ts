import { CrackedError } from "cracked-lib";
import z from "zod";

export const znBase = z.looseObject({
  _type: z.string().nonempty(),
  _name: z.string().optional(),
  _desc: z.string().optional(),
});

const znRef = z.strictObject({
  _type: z.literal("ref"),
  _ref: z.string().nonempty(),
  _disallowRoot: z.literal(true).optional().default(true),
});

const znInnerNode = z.union([znRef, znBase]);
const znArrayInner = z.array(znInnerNode);
const znMappedInner = z.record(z.string().nonempty(), znInnerNode);
const znFunctionInner = z.object({
  _in: znMappedInner.optional(),
  _out: znInnerNode.optional(),
});

export const PRIMITIVE_TYPES = [
  "i8",
  "i16",
  "i32",
  "i64",
  "u8",
  "u16",
  "u32",
  "u64",
  "f64",
  "bool",
  "char",
  "string",
] as const;
export type PRIMITIVE_TYPE = (typeof PRIMITIVE_TYPES)[number];
export const UNARY_TYPES = [
  "array",
  "nullable",
  "optional",
  "set",
  "binary_tree",
  "linked_list",
] as const;
export type UNARY_TYPE = (typeof UNARY_TYPES)[number];
export const VARIADIC_TYPES = ["map", "tuple", "variant"] as const;
export type VARIADIC_TYPE = (typeof VARIADIC_TYPES)[number];
export const CONTAINER_TYPES = [...UNARY_TYPES, ...VARIADIC_TYPES] as const;
export type CONTAINER_TYPE = (typeof CONTAINER_TYPES)[number];
export const MAPPED_TYPES = ["object"] as const;
export type MAPPED_TYPE = (typeof MAPPED_TYPES)[number];
export const IO_TYPES = ["function"] as const;
export type IO_TYPE = (typeof IO_TYPES)[number];

export const zn = z.discriminatedUnion("_type", [
  znRef,
  z.object({
    _type: z.enum(PRIMITIVE_TYPES),
    _name: z.string().optional(),
    _desc: z.string().optional(),
  }),
  z.object({
    _type: z.enum(UNARY_TYPES),
    _name: z.string().optional(),
    _desc: z.string().optional(),
    _inner: znInnerNode,
  }),
  z
    .object({
      _type: z.enum(VARIADIC_TYPES),
      _name: z.string().optional(),
      _desc: z.string().optional(),
      _inner: znArrayInner,
    })
    .superRefine((val, ctx) => {
      if (val._type === "map" && val._inner.length !== 2) {
        ctx.addIssue({
          code: "custom",
          path: ["_inner"],
          message: "_inner must have exactly two elements when _type is 'map'",
        });
      }
    }),
  z.object({
    _type: z.enum(MAPPED_TYPES),
    _name: z.string().nonempty(),
    _desc: z.string().optional(),
    _inner: znMappedInner,
  }),
  z.object({
    _type: z.enum(IO_TYPES),
    _name: z.string().nonempty(),
    _desc: z.string().nonempty(),
    _inner: znFunctionInner,
  }),
]);

export type ZN_TYPE = z.infer<typeof zn>["_type"];
export type ZN_REF_LIKE = z.infer<typeof znRef>;
export type ZN_NODE_LIKE = z.infer<typeof znBase>;
export type ZN_LIKE = z.infer<typeof znInnerNode>;

export type ZN_CONTAINER_LIKE = ZN_NODE_LIKE & {
  _inner: z.infer<typeof znInnerNode> | z.infer<typeof znArrayInner>;
};

export type ZN_NONPRIMITIVE_LIKE = ZN_NODE_LIKE & {
  _inner:
    | z.infer<typeof znInnerNode>
    | z.infer<typeof znArrayInner>
    | z.infer<typeof znMappedInner>
    | z.infer<typeof znFunctionInner>;
};

export const isPrimitive = (
  input: unknown,
): input is ZN_NODE_LIKE & { _inner: never; _type: PRIMITIVE_TYPE } =>
  zn.safeParse(input).success &&
  PRIMITIVE_TYPES.findIndex((v) => v === (input as ZN_NODE_LIKE)._type) !== -1;

export const isNonPrimitive = (
  input: unknown,
): input is ZN_NONPRIMITIVE_LIKE => {
  if (isPrimitive(input)) {
    return false;
  }

  // if it isn't primitive, but is still parsed, then
  // it must be nonprimitive
  const isNonPrimitive = zn.safeParse(input).success;
  return isNonPrimitive;
};

export const isContainer = (input: unknown): input is ZN_CONTAINER_LIKE =>
  // is a node
  zn.safeParse(input).success &&
  // has a container type
  CONTAINER_TYPES.findIndex((v) => v === (input as ZN_NODE_LIKE)._type) !==
    -1 &&
  // has the expected inner structure (maybe redundant)
  (hasUnaryInner(input) || hasArrayInner(input));

export const isRefNode = (x: unknown): x is z.infer<typeof znRef> =>
  znRef.safeParse(x).success;

export const hasUnaryInner = (
  x: unknown,
): x is ZN_NONPRIMITIVE_LIKE & { _inner: z.infer<typeof znInnerNode> } =>
  isNonPrimitive(x) && znInnerNode.safeParse(x._inner).success;

export const hasArrayInner = (
  x: unknown,
): x is ZN_NONPRIMITIVE_LIKE & { _inner: z.infer<typeof znArrayInner> } =>
  isNonPrimitive(x) && znArrayInner.safeParse(x._inner).success;

export const hasMappedInner = (
  x: unknown,
): x is ZN_NONPRIMITIVE_LIKE & { _inner: z.infer<typeof znMappedInner> } =>
  isNonPrimitive(x) && znMappedInner.safeParse(x._inner).success;

export const hasFunctionInner = (
  x: unknown,
): x is ZN_NONPRIMITIVE_LIKE & { _inner: z.infer<typeof znFunctionInner> } =>
  isNonPrimitive(x) && znFunctionInner.safeParse(x._inner).success;

export const collectInnerNodes = (outer: ZN_NONPRIMITIVE_LIKE): ZN_LIKE[] => {
  if (hasUnaryInner(outer)) {
    return [outer._inner];
  } else if (hasArrayInner(outer)) {
    return outer._inner;
  } else if (hasMappedInner(outer)) {
    // satisfy type checker
    return znArrayInner.parse(Object.values(outer._inner));
  } else if (hasFunctionInner(outer)) {
    const inner = outer._inner;
    const res = [];
    if (inner._out) {
      res.push(inner._out);
    }
    if (inner._in) {
      res.push(...Object.values(inner._in));
    }
    return res;
  }

  throw new CrackedError("PARSE_ERROR", {
    message: "Running collectInnerNodes on non-matched inner type",
  });
};
