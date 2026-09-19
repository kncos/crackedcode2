import z, { ZodType } from 'zod';
import { BuiltinTypeHandlerMap } from '.';
import { applyHashComment, NodeLike } from '../utils';

const zodContainer = (input: NodeLike, refmap: Map<string, z.ZodType>, schema: z.ZodType) => {
  if (input._name) refmap.set(input._name, schema);
  return { zData: schema };
};

export const containerHandlers = {
  array: {
    cpp: (input, callHandler) => {
      const inner = callHandler(input._inner).typeRef;
      return {
        typeRef: input._name ?? `std::vector<${inner}>`,
        typeDef: input._name ? `using ${input._name} = std::vector<${inner}>;` : undefined,
      };
    },
    python: (input, callHandler) => {
      const { stintRef: innerStintRef, typeRef: innerTypeRef } = callHandler(input._inner);
      const typeRef = input._name ?? `list[${innerTypeRef}]`;
      const typeDef = input._name ? `${input._name} = list[${innerTypeRef}]` : undefined;
      const stintRef = input._name ? `parse${input._name}` : 'parseArray';
      return {
        typeRef,
        typeDef,
        stintRef,
        stintDef: input._name
          ? `def ${stintRef}(val) -> Expected[list[${innerTypeRef}]]: return parseArray(val, ${innerStintRef})`
          : undefined,
        doc: applyHashComment(input._desc),
      };
    },
    zod: (input, callHandler, refmap) => {
      const innerZod = callHandler(input._inner, refmap);
      return zodContainer(input, refmap, z.array(innerZod.zData));
    },
  },
  nullable: {
    cpp: (input, callHandler) => {
      const inner = callHandler(input._inner).typeRef;
      return {
        typeRef: input._name ?? `${inner}*`,
        typeDef: input._name ? `using ${input._name} = ${inner}*;` : undefined,
      };
    },
    python: (input, callHandler) => {
      const { stintRef: innerStintRef, typeRef: innerTypeRef } = callHandler(input._inner);
      const typeRef = input._name ?? `${innerTypeRef} | None`;
      const typeDef = input._name ? `${input._name} = ${innerTypeRef} | None` : undefined;
      const stintRef = input._name ? `parse${input._name}` : 'parseNullable';
      return {
        typeRef,
        typeDef,
        stintRef,
        stintDef: input._name
          ? `def ${stintRef}(x) -> Expected[${innerTypeRef} | None]: return parseNullable(x, ${innerStintRef})`
          : undefined,
        doc: applyHashComment(input._desc),
      };
    },
    zod: (input, callHandler, refmap) => {
      const innerZod = callHandler(input._inner, refmap);
      return zodContainer(input, refmap, innerZod.zData.nullable());
    },
  },
  optional: {
    cpp: (input, callHandler) => {
      const inner = callHandler(input._inner).typeRef;
      return {
        typeRef: input._name ?? `std::optional<${inner}>`,
        typeDef: input._name ? `using ${input._name} = std::optional<${inner}>;` : undefined,
      };
    },
    python: (input, callHandler) => {
      // reuse nullable for python
      return callHandler({ ...input, _type: 'nullable' });
    },
    zod: (input, callHandler, refmap) => {
      const innerZod = callHandler(input._inner, refmap);
      return zodContainer(input, refmap, innerZod.zData.optional());
    },
  },
  map: {
    cpp: (input, callHandler) => {
      const inners = input._inner.map((node) => callHandler(node).typeRef);
      return {
        typeRef: input._name ?? `std::map<${inners.join(', ')}>`,
        typeDef: input._name ? `using ${input._name} = std::map<${inners.join(', ')}>;` : undefined,
      };
    },
    python: (input, callHandler) => {
      const { stintRef: parseKey, typeRef: keyType } = callHandler(input._inner[0]);
      const { stintRef: parseVal, typeRef: valType } = callHandler(input._inner[1]);
      const typeRef = input._name ?? `dict[${keyType}, ${valType}]`;
      const stintRef = input._name ? `parse${input._name}` : 'parseMap';
      return {
        typeRef,
        typeDef: input._name ? `${input._name} = dict[${keyType}, ${valType}]` : undefined,
        stintRef,
        stintDef: input._name
          ? `def ${stintRef}(x) -> Expected[dict[${keyType}, ${valType}]]: return parseMap(x, (${parseKey}, ${parseVal}))`
          : undefined,
        doc: applyHashComment(input._desc),
      };
    },
    zod: (input, callHandler, refmap) => {
      const valZod = callHandler(input._inner[1], refmap);
      return zodContainer(input, refmap, z.record(z.string(), valZod.zData));
    },
  },
  variant: {
    cpp: (input, callHandler) => {
      const inners = input._inner.map((node) => callHandler(node).typeRef);
      return {
        typeRef: input._name ?? `std::variant<${inners.join(', ')}>`,
        typeDef: input._name
          ? `using ${input._name} = std::variant<${inners.join(', ')}>;`
          : undefined,
      };
    },
    python: (input, callHandler) => {
      const resolved = input._inner.map((node) => callHandler(node));
      const parsers = resolved.map((res) => res.stintRef);
      const types = resolved.map((res) => res.typeRef);
      const typeRef = input._name ?? types.join(' | ');
      const stintRef = input._name ? `parse${input._name}` : 'parseVariant';
      return {
        typeRef,
        typeDef: input._name ? `${input._name} = ${types.join(' | ')}` : undefined,
        stintRef,
        stintDef: input._name
          ? `def ${stintRef}(x) -> Expected[${typeRef}]: return parseVariant(x, [${parsers.join(', ')}])`
          : undefined,
        doc: applyHashComment(input._desc),
      };
    },
    zod: (input, callHandler, refmap) => {
      const options = input._inner.map((node) => callHandler(node, refmap).zData);
      return zodContainer(input, refmap, z.union(options));
    },
  },
  tuple: {
    cpp: (input, callHandler) => {
      const inners = input._inner.map((node) => callHandler(node).typeRef);
      return {
        typeRef: input._name ?? `std::tuple<${inners.join(', ')}>`,
        typeDef: input._name
          ? `using ${input._name} = std::tuple<${inners.join(', ')}>;`
          : undefined,
      };
    },
    python: (input, callHandler) => {
      const resolved = input._inner.map((node) => callHandler(node));
      const innerTypes = resolved.map((res) => res.typeRef);
      const typeRef = input._name ?? `tuple[${innerTypes.join(', ')}]`;
      const stintRef = input._name ? `parse${input._name}` : 'parseTuple';
      return {
        typeRef,
        typeDef: input._name ? `${input._name} = tuple[${innerTypes.join(', ')}]` : undefined,
        stintRef,
        stintDef: input._name
          ? `def ${stintRef}(x) -> Expected[${typeRef}]: return parseTuple(x, [${resolved.map((res) => res.stintRef).join(', ')}])`
          : undefined,
        doc: applyHashComment(input._desc),
      };
    },
    zod: (input, callHandler, refmap) => {
      const schemas = input._inner.map((node) => callHandler(node, refmap).zData);
      const tupleSchema =
        schemas.length === 0 ? z.tuple([]) : z.tuple(schemas as [ZodType, ...ZodType[]]);
      return zodContainer(input, refmap, tupleSchema);
    },
  },
} as const satisfies Partial<BuiltinTypeHandlerMap>;
