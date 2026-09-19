import z from 'zod';
import { builtinHandlers, builtinLangs, builtinSchemas } from '../../typesDSL/builtins';
import { createRegistry, TypeHandlerMap } from '../../typesDSL/codec';
import { collectUnaryInner, createTypeSchema, zUnaryInner } from '../../typesDSL/utils';
import { binaryTreeHandlers } from './binary-tree';
import { linkedListHandlers } from './linked-list';
import { multiCallerHandlers } from './multi-caller';
import { singleCallerHandlers } from './single-caller';

export const binaryTreeSchema = createTypeSchema('binaryTree')
  .extend({
    _name: z.string().nonempty(),
    _inner: zUnaryInner,
  })
  .transform((out) => ({
    ...out,
    _collectDeps: () => collectUnaryInner(out._inner),
  }));

export const linkedListSchema = createTypeSchema('linkedList')
  .extend({
    _name: z.string().nonempty(),
    _inner: zUnaryInner,
  })
  .transform((out) => ({
    ...out,
    _collectDeps: () => collectUnaryInner(out._inner),
  }));

export const singleCallerSchema = createTypeSchema('singleCaller')
  .extend({
    _name: z.string().nonempty(),
    _inner: builtinSchemas.function,
    _useStorageKey: z.string().optional(),
  })
  .transform((obj) => ({
    ...obj,
    _collectDeps: () => collectUnaryInner(obj._inner),
  }));

export const multiCallerSchema = createTypeSchema('multiCaller')
  .extend({
    _name: z.string().nonempty(),
    _inner: z.record(z.string(), singleCallerSchema),
  })
  .transform((obj) => ({
    ...obj,
    // look through the caller and allow this type to handle defining it within its own scope
    _collectDeps: () => Object.values(obj._inner).flatMap((caller) => caller._collectDeps()),
  }));

export const platformSchemas = {
  ...builtinSchemas,
  binaryTree: binaryTreeSchema,
  linkedList: linkedListSchema,
  singleCaller: singleCallerSchema,
  multiCaller: multiCallerSchema,
} as const;

export type PlatformTypeHandlerMap = TypeHandlerMap<typeof builtinLangs, typeof platformSchemas>;

export const platformHandlers = {
  ...builtinHandlers,
  binaryTree: binaryTreeHandlers,
  linkedList: linkedListHandlers,
  singleCaller: singleCallerHandlers,
  multiCaller: multiCallerHandlers,
} as const satisfies PlatformTypeHandlerMap;

export const getPlatformRegistry = () =>
  createRegistry(builtinLangs, platformSchemas, platformHandlers);
