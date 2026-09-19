import z, { ZodDiscriminatedUnion, ZodType } from 'zod';
import { $ZodTypeDiscriminable } from 'zod/v4/core';
import { NonEmptyArrayOf, Prettify } from '../utils';
import { NodeLike } from './utils';

type RestrictedOutput<TType extends string> =
  | {
      _type: TType;
      _name?: string;
      _ref?: string;
      _desc?: string;
      _inner?: never;
      _collectDeps?: never;
    }
  | {
      _type: TType;
      _name?: string;
      _ref?: string;
      _desc?: string;
      _inner: unknown;
      _collectDeps: () => NodeLike[];
    };

export type TypeSchema<
  TType extends string = string,
  TOutput extends RestrictedOutput<TType> = RestrictedOutput<TType>,
  TInput extends Record<string, unknown> | unknown = unknown,
> = ZodType<TOutput, TInput> & $ZodTypeDiscriminable;

export type ExtractTypeFromTypeSchema<T extends TypeSchema> = z.infer<T>['_type'];

export type TypeSchemaMap = { [K in string]: TypeSchema<K> };

export type HandlerResult = {
  include?: string | undefined;
  dec?: string | undefined;
  typeRef: string;
  typeDef?: string | undefined;
  stintRef?: string | undefined;
  stintDef?: string | undefined;
  doc?: string | undefined;
  impl?: string | undefined;
  callback?: string | undefined;
};

/** ephemeral type that will be used to store type data associated with
 * what the return type of handlers should be for a language, as well as
 * the type of an optional additional args that may be supplied
 */
export type LanguageTypes<TReturn = HandlerResult, TArgs extends Array<unknown> = []> = {
  return: TReturn;
  args: TArgs;
};

/** Maps language names to their handler return types. */
export type LangDef = Record<string, LanguageTypes<unknown, unknown[]>>;
type EmptyLangDef = Record<never, never>;

/** Given a LangBuilder, typed callHandler which returns the correct type per-language */
export type CallLangHandlerFn<TLanguageTypes extends LanguageTypes<unknown, unknown[]>> = (
  node: NodeLike,
  ...args: TLanguageTypes['args']
) => TLanguageTypes['return'];

export type CallLangHandlerFnMap<TLangBuilder extends LangBuilder> =
  TLangBuilder extends LangBuilder<infer U>
    ? {
        [L in keyof U]: CallLangHandlerFn<U[L]>;
      }
    : never;

export type LangBuilder<TLangDef extends LangDef = EmptyLangDef> = {
  /** Register a new language. Provide T as the handler return type for this lang.
   *  Because TypeScript does not support partial type argument inference, you must
   *  supply both type args explicitly when T is not HandlerResult:
   *    .addLang<'rust', RustResult>('rust')
   *  When T = HandlerResult the default applies and only the string is needed:
   *    .addLang('cpp')
   */
  addLang<
    const TLang extends string,
    TLanguageTypes extends LanguageTypes<unknown, unknown[]> = LanguageTypes,
  >(
    lang: TLang,
  ): LangBuilder<TLangDef & Record<TLang, TLanguageTypes>>;
  /** The accumulated lang→returnType map (phantom at runtime). */
  readonly def: TLangDef;
  /** The registered lang names as a readonly array. */
  readonly langNames: ReadonlyArray<string>;
};

/** Expected structure of object that defines all handlers for a set of type schemas and languages */
export type TypeHandlerMap<
  TLangBuilder extends LangBuilder = LangBuilder,
  TTypeSchemaMap extends TypeSchemaMap = TypeSchemaMap,
> = Prettify<{
  // for each type:
  [T in keyof TTypeSchemaMap]: LangHandlerFnMap<TLangBuilder, TTypeSchemaMap[T]>;
}>;

/**
 * individual nodes will have this handler function for themselves, accepts a generic callHandler
 * fn which accepts any node and can be used for recursive descent
 */
export type LangHandlerFn<
  TTypeSchema extends TypeSchema,
  TTypeData extends LanguageTypes<unknown, unknown[]> = LanguageTypes,
> = (
  node: z.infer<TTypeSchema>,
  callHandler: CallLangHandlerFn<TTypeData>,
  ...args: TTypeData['args']
) => TTypeData['return'];

/** Expected structure of a handler on a set of languages for a given schema */
export type LangHandlerFnMap<
  TLangBuilder extends LangBuilder = LangBuilder,
  TTypeSchema extends TypeSchema = TypeSchema,
> =
  TLangBuilder extends LangBuilder<infer U>
    ? {
        [L in keyof U]: LangHandlerFn<TTypeSchema, U[L]>;
      }
    : 'TLangBuilder does not extend LangBuilder.';

// simple merge
export type MergeLangHandlerFnMap<
  T1 extends LangHandlerFnMap,
  T2 extends LangHandlerFnMap,
> = Prettify<{
  [K in keyof (T1 & T2)]: K extends keyof T2 ? T2[K] : K extends keyof T1 ? T1[K] : never;
}>;

// merge both type handlers
export type MergeTypeHandlerMap<T1 extends TypeHandlerMap, T2 extends TypeHandlerMap> = Prettify<{
  [K in keyof (T1 & T2)]: K extends keyof T1
    ? K extends keyof T2
      ? // k in both t1 and t2
        MergeLangHandlerFnMap<T1[K], T2[K]>
      : T1[K] // k only in t1
    : K extends keyof T2
      ? T2[K] // k only in t2
      : never; // k in neither
}>;

export type MergeTypeHandlerMapArr<Ts extends readonly TypeHandlerMap[]> = Prettify<
  Ts extends readonly [infer Head, ...infer Tail]
    ? Head extends TypeHandlerMap
      ? Tail extends readonly TypeHandlerMap[]
        ? Tail extends readonly [TypeHandlerMap, ...TypeHandlerMap[]]
          ? MergeTypeHandlerMap<Head, MergeTypeHandlerMapArr<Tail>>
          : Head
        : never
      : never
    : never
>;

export function defineLangs(): LangBuilder<EmptyLangDef> {
  function make<Langs extends LangDef>(names: string[]): LangBuilder<Langs> {
    return {
      addLang<const L extends string, T extends LanguageTypes<unknown, unknown[]> = LanguageTypes>(
        lang: L,
      ) {
        return make<Langs & Record<L, T>>([...names, lang]);
      },
      get def() {
        return Object.fromEntries(names.map((l) => [l, {}])) as Langs;
      },
      get langNames() {
        return names as ReadonlyArray<string>;
      },
    };
  }
  return make<EmptyLangDef>([]);
}

/** The merged handler table: type name → lang name → handler fn. */
export const mergeTypeHandlerMaps = <T extends readonly TypeHandlerMap[]>(
  ...handlers: T
): MergeTypeHandlerMapArr<T> => {
  if (handlers.length === 0) throw new Error('Cannot merge empty handlers set!');
  if (handlers.length === 1) return handlers[0] as unknown as MergeTypeHandlerMapArr<T>;
  return handlers.reduce((acc, curr) => ({
    ...acc,
    ...Object.fromEntries(
      Object.entries(curr).map(([typeName, langHandlers]) => [
        typeName,
        { ...acc[typeName], ...langHandlers },
      ]),
    ),
  })) as unknown as MergeTypeHandlerMapArr<T>;
};

type CheckConsistency<
  TLangBuilder extends LangBuilder,
  TTypeSchemaMap extends TypeSchemaMap,
  TTypeHandlerMap extends TypeHandlerMap,
> =
  // 1. Every key in Schemas must be in Handlers
  Exclude<keyof TTypeSchemaMap, keyof TTypeHandlerMap> extends never
    ? // 2 & 3. For every key (Category) in Handlers...
      {
        [Category in keyof TTypeHandlerMap]: [keyof TTypeHandlerMap[Category]] extends [
          keyof TLangBuilder,
        ] // Check if the keys of this specific handler match Langs exactly
          ? [keyof TLangBuilder] extends [keyof TTypeHandlerMap[Category]]
            ? true
            : 'MISSING_LANG_IN_HANDLER'
          : 'EXTRA_OR_MISMATCHED_LANG_IN_HANDLER';
      }[keyof TTypeHandlerMap] extends true
      ? true
      : never
    : 'MISSING_SCHEMA_CATEGORY_IN_HANDLERS';

const zSchemaFilter = z.looseObject({ _zod: z.looseObject({}) });

export type Registry<Langs extends LangBuilder, _T extends Record<string, TypeSchema>> = {
  languageResolvers: CallLangHandlerFnMap<Langs>;
  getAllTypesZodSchema(): ZodDiscriminatedUnion<NonEmptyArrayOf<TypeSchema>, '_type'>;
};

export function createRegistry<
  const _langs extends LangBuilder,
  const _schemas extends TypeSchemaMap,
  const _handlers extends TypeHandlerMap<_langs, _schemas>,
>(
  langs: _langs,
  schemas: _schemas,
  handlers: _handlers &
    (CheckConsistency<_langs, _schemas, _handlers> extends true
      ? unknown
      : 'ERROR: inconsistent handlers/schemas/langs'),
): Registry<_langs, _schemas> {
  // build up
  const resolvers = Object.fromEntries(
    langs.langNames.map((lang) => {
      type t =
        _langs extends LangBuilder<infer U>
          ? typeof lang extends keyof U
            ? U[typeof lang]
            : never
          : never;
      const callLangHandler: CallLangHandlerFn<t> = (node, ...args) => {
        // @ts-expect-error cannot infer type of handlers since it isn't concrete here
        const handler = handlers?.[node._type]?.[lang] as LangHandlerFn<TypeSchema, t>;
        if (!handler) {
          throw new Error(`[ERROR] No handler for type ${node._type} on lang ${lang}.`);
        }
        return handler(node, callLangHandler, ...args);
      };
      return [lang, callLangHandler];
    }),
  );

  const getAllTypesZodSchema = (): ZodDiscriminatedUnion<NonEmptyArrayOf<TypeSchema>, '_type'> => {
    const unionParts = Object.values(schemas).filter(
      (s): s is TypeSchema => zSchemaFilter.safeParse(s).success,
    );
    if (unionParts.length === 0) {
      throw new Error('[ERROR] Cannot create zod schema: no types registered.');
    }
    return z.discriminatedUnion('_type', unionParts as NonEmptyArrayOf<TypeSchema>);
  };

  return { languageResolvers: resolvers as CallLangHandlerFnMap<_langs>, getAllTypesZodSchema };
}
