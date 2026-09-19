import z, { ZodType } from 'zod';
import { BuiltinTypeHandlerMap } from '.';
import { applyHashComment, applySlashComment, NodeLike } from '../utils';

type PyPrimitive = 'str' | 'int' | 'float' | 'bool' | 'complex';
const pythonPrimitive = (input: NodeLike, opts: { fnName: string; typeName: PyPrimitive }) => {
  const stintRef = input._name ? `parse${input._name}` : opts.fnName;
  return {
    typeRef: input._name ?? opts.typeName,
    typeDef: input._name ? `${input._name} = ${opts.typeName}` : undefined,
    stintRef,
    stintDef: input._name
      ? `def ${stintRef}(val: ${opts.typeName}) -> Expected[${opts.typeName}]: return ${opts.fnName}(val)`
      : undefined,
    doc: applyHashComment(input._desc),
  };
};

const cppPrimitive = (input: NodeLike, opts: { typeName: string }) => ({
  typeRef: input._name ?? `${opts.typeName}`,
  typeDef: input._name ? `using ${input._name} = ${opts.typeName};` : undefined,
  doc: applySlashComment(input._desc),
});

const zodPrimitive = (input: NodeLike, refmap: Map<string, ZodType>, schema: ZodType) => {
  if (input._name) refmap.set(input._name, schema);
  return { zData: schema };
};

// allow bigint passthrough for smaller int sizes but just cast to number
const zUnwrapBigint = <T extends ZodType>(schema: T) =>
  z.preprocess((input) => {
    if (typeof input === 'bigint') return Number(input);
    return input;
  }, schema);

export const primitiveHandlers = {
  ref: {
    cpp: (input) => ({ typeRef: input._ref }),
    python: (input) => ({ typeRef: input._ref, stintRef: `parse${input._ref}` }),
    zod: (input, _, refmap) => ({
      zData: refmap.get(input._ref) || z.never('FAILED TO DEREF ZOD TYPE'),
    }),
  },
  i8: {
    cpp: (input) => cppPrimitive(input, { typeName: 'int8_t' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseI8', typeName: 'int' }),
    zod: (input, _, refmap) =>
      zodPrimitive(input, refmap, zUnwrapBigint(z.int().min(-128).max(127))),
  },
  u8: {
    cpp: (input) => cppPrimitive(input, { typeName: 'uint8_t' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseU8', typeName: 'int' }),
    zod: (input, _, refmap) => zodPrimitive(input, refmap, zUnwrapBigint(z.int().min(0).max(255))),
  },
  i16: {
    cpp: (input) => cppPrimitive(input, { typeName: 'int16_t' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseI16', typeName: 'int' }),
    zod: (input, _, refmap) =>
      zodPrimitive(input, refmap, zUnwrapBigint(z.int().min(-32768).max(32767))),
  },
  u16: {
    cpp: (input) => cppPrimitive(input, { typeName: 'uint16_t' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseU16', typeName: 'int' }),
    zod: (input, _, refmap) =>
      zodPrimitive(input, refmap, zUnwrapBigint(z.int().min(0).max(65535))),
  },
  i32: {
    cpp: (input) => cppPrimitive(input, { typeName: 'int32_t' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseI32', typeName: 'int' }),
    zod: (input, _, refmap) => zodPrimitive(input, refmap, zUnwrapBigint(z.int32())),
  },
  u32: {
    cpp: (input) => cppPrimitive(input, { typeName: 'uint32_t' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseU32', typeName: 'int' }),
    zod: (input, _, refmap) => zodPrimitive(input, refmap, zUnwrapBigint(z.uint32())),
  },
  i64: {
    cpp: (input) => cppPrimitive(input, { typeName: 'int64_t' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseI64', typeName: 'int' }),
    zod: (input, _, refmap) => zodPrimitive(input, refmap, z.int64()),
  },
  u64: {
    cpp: (input) => cppPrimitive(input, { typeName: 'uint64_t' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseU64', typeName: 'int' }),
    zod: (input, _, refmap) => zodPrimitive(input, refmap, z.uint64()),
  },
  f64: {
    cpp: (input) => cppPrimitive(input, { typeName: 'double' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseF64', typeName: 'float' }),
    zod: (input, _, refmap) => zodPrimitive(input, refmap, z.float64()),
  },
  bool: {
    cpp: (input) => cppPrimitive(input, { typeName: 'bool' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseBool', typeName: 'bool' }),
    zod: (input, _, refmap) => zodPrimitive(input, refmap, z.boolean()),
  },
  char: {
    cpp: (input) => cppPrimitive(input, { typeName: 'char' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseChar', typeName: 'str' }),
    zod: (input, _, refmap) => zodPrimitive(input, refmap, z.string().length(1)),
  },
  string: {
    cpp: (input) => cppPrimitive(input, { typeName: 'std::string' }),
    python: (input) => pythonPrimitive(input, { fnName: 'parseStr', typeName: 'str' }),
    zod: (input, _, refmap) => zodPrimitive(input, refmap, z.string()),
  },
} as const satisfies Partial<BuiltinTypeHandlerMap>;
