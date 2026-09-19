import z from 'zod';

export const zNodeLike = z.looseObject({
  _type: z.string().nonempty(),
  _name: z.string().optional(),
  _desc: z.string().optional(),
});

export type NodeLike = z.infer<typeof zNodeLike>;

export const zUnaryInner = zNodeLike;
export const collectUnaryInner = (input: z.infer<typeof zUnaryInner>): NodeLike[] => [input];

export const zVariadicInner = z.array(zNodeLike);
export const collectVariadicInner = (input: z.infer<typeof zVariadicInner>): NodeLike[] => input;

export const zMappedInner = z.record(z.string(), zNodeLike);
export const collectMappedInner = (input: z.infer<typeof zMappedInner>): NodeLike[] =>
  Object.values(input);

export const zFunctionInner = z.looseObject({
  _in: z.optional(zMappedInner),
  _out: z.optional(zUnaryInner),
});
export const collectFunctionInner = (input: z.infer<typeof zFunctionInner>) => {
  const res = Object.values(input._in ?? {});
  if (input._out) res.push(input._out);
  return res;
};

export const createRefSchema = <_Type extends string>(typeName: _Type) =>
  z.object({
    _type: z.literal(typeName),
    _ref: z.string().nonempty(),
    _disallowRoot: z.literal(true).optional().default(true),
  });

export const createTypeSchema = <_Type extends string>(typeName: _Type) =>
  z.object({
    _type: z.literal(typeName),
    _name: z.string().nonempty().optional(),
    _desc: z.string().optional(),
  });

export const createUnaryTypeSchema = <_Type extends string>(typeName: _Type) =>
  createTypeSchema(typeName)
    .extend({
      _inner: zUnaryInner,
    })
    .transform((out) => ({
      ...out,
      _collectDeps: () => collectUnaryInner(out._inner),
    }));

export const createVariadicTypeSchema = <_Type extends string>(typeName: _Type, length?: number) =>
  createTypeSchema(typeName)
    .extend({
      _inner: length ? zVariadicInner.length(length) : zVariadicInner,
    })
    .transform((out) => ({
      ...out,
      _collectDeps: () => collectVariadicInner(out._inner),
    }));

export const createMappedTypeSchema = <_Type extends string>(typeName: _Type) =>
  createTypeSchema(typeName)
    .extend({
      _name: z.string().nonempty(),
      _inner: zMappedInner,
    })
    .transform((out) => ({
      ...out,
      _collectDeps: () => collectMappedInner(out._inner),
    }));

export const createFunctionTypeSchema = <_Type extends string>(typeName: _Type) =>
  createTypeSchema(typeName)
    .extend({
      _name: z.string().nonempty(),
      _inner: zFunctionInner,
    })
    .transform((out) => ({
      ...out,
      _collectDeps: () => collectFunctionInner(out._inner),
    }));

export const prefixLines = <T extends string | undefined>(input: T, prefix: string) =>
  input?.replace(/^/gm, prefix) as T extends string ? string : undefined;

export const applySlashComment = <T extends string | undefined>(input: T) =>
  prefixLines(input, '// ');
export const applyHashComment = <T extends string | undefined>(input: T) =>
  prefixLines(input, '# ');

export const indent = <T extends string | undefined>(input: T, level: number = 1) =>
  prefixLines(input, '  '.repeat(level));
