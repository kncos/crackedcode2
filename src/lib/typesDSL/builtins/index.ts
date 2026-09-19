import { ZodType } from 'zod';
import { createRegistry, defineLangs, LanguageTypes, TypeHandlerMap } from '../codec';
import {
  createFunctionTypeSchema,
  createMappedTypeSchema,
  createRefSchema,
  createTypeSchema,
  createUnaryTypeSchema,
  createVariadicTypeSchema,
} from '../utils';
import { containerHandlers } from './container-handlers';
import { functionHandlers } from './function-handlers';
import { objectHandlers } from './object-handlers';
import { primitiveHandlers } from './primitive-handlers';

export const builtinSchemas = {
  ref: createRefSchema('ref'),
  i8: createTypeSchema('i8'),
  u8: createTypeSchema('u8'),
  i16: createTypeSchema('i16'),
  u16: createTypeSchema('u16'),
  i32: createTypeSchema('i32'),
  u32: createTypeSchema('u32'),
  i64: createTypeSchema('i64'),
  u64: createTypeSchema('u64'),
  f64: createTypeSchema('f64'),
  bool: createTypeSchema('bool'),
  char: createTypeSchema('char'),
  string: createTypeSchema('string'),
  array: createUnaryTypeSchema('array'),
  nullable: createUnaryTypeSchema('nullable'),
  optional: createUnaryTypeSchema('optional'),
  map: createVariadicTypeSchema('map', 2),
  variant: createVariadicTypeSchema('variant'),
  tuple: createVariadicTypeSchema('tuple'),
  object: createMappedTypeSchema('object'),
  function: createFunctionTypeSchema('function'),
} as const;

export type BuiltinType = keyof typeof builtinSchemas;

type ZodTypeName = string;

export const builtinLangs = defineLangs()
  .addLang('cpp')
  .addLang('python')
  .addLang<'zod', LanguageTypes<{ zData: ZodType }, [Map<ZodTypeName, ZodType>]>>('zod');
// .addLang<'zod', { dataSchema: ZodType }>('zod');
export type BuiltinTypeHandlerMap = TypeHandlerMap<typeof builtinLangs, typeof builtinSchemas>;

export const builtinHandlers = {
  ...primitiveHandlers,
  ...containerHandlers,
  ...objectHandlers,
  ...functionHandlers,
} as const satisfies BuiltinTypeHandlerMap;

/** Returns a ready-to-use registry with all built-in types and handlers. */
export const getBuiltinRegistry = () =>
  createRegistry(builtinLangs, builtinSchemas, builtinHandlers);
