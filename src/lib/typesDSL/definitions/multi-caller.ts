import z from 'zod';
import { applySlashComment, indent } from '../../typesDSL/utils';
import type { PlatformTypeHandlerMap } from './index';
import { singleCallerHandlers } from './single-caller';

// on the input schema, when a storage key is referenced, this is the identifier. So,
// input data might look like { "{keyref_id}": "<some storage key>"" }
const keyref_id = '_storageKey' as const;

export const multiCallerHandlers = {
  cpp: (input, callHandler) => {
    // build a storage struct by introspecting the function return type
    // of each caller and getting a key: type pair for each fn that has a return value
    const storageInner = Object.fromEntries(
      Object.entries(input._inner)
        .filter(([_, caller]) => caller._inner._inner._out)
        .map(([key, caller]) => [key, callHandler(caller._inner._inner._out!).typeRef] as const),
    );
    // need names of all functions for glz meta
    const fnNames = Object.values(input._inner).map((caller) => caller._inner._name);
    // easy access to all keys for enumeration
    const storageKeys = Object.keys(storageInner);

    // note that on the final struct, storage is instantiated as a variable.
    // storage just has a key for each function to store its return value into,
    // but since this is generated on the outer multiCaller struct, we can
    // technically initialize storage when reading test case json
    const storageDef = [
      'struct Storage {',
      `  enum class key_t { ${Object.keys(storageInner).join(', ')} };`,
      `  struct keyref_t { key_t ${keyref_id}; };`,
      Object.entries(storageInner)
        .map(([k, t]) => `  ${t} ${k};`)
        .join('\n'),
      ``,
      `  template <typename T>`,
      `  T resolve(const std::variant<T, keyref_t> arg) {`,
      `    if (std::holds_alternative<T>(arg)) return std::get<T>(arg);`,
      `    switch (std::get<keyref_t>(arg).${keyref_id}) {`,
      storageKeys.map((k) => indent(`case key_t::${k}: { return ${k}; }`, 3)).join('\n'),
      `    }`,
      `    std::cerr << "[FATAL] Attempting to resolve invalid key." << std::endl;`,
      `    std::terminate();`,
      `  }`,
      ``,
      `  template <typename T>`,
      `  void store(key_t key, T val) {`,
      `    switch(key) {`,
      storageKeys.map((k) => indent(`case key_t::${k}: { ${k} = val; return; }`, 3)).join('\n'),
      `    }`,
      `    std::cerr << "[FATAL] Attempting to store invalid key." << std::endl;`,
      `    std::terminate();`,
      `  }`,
      `} storage;\n`,
    ].join('\n');

    // callers are basically structs that wrap the function and expose a call() method
    // which calls the function with the struct's props and compares the result to expect.
    // multicaller can have a bunch of these, and they will all be in its scope
    const resolvedCallers = Object.entries(input._inner)
      .map(([k, caller]) => callHandler({ ...caller, _useStorageKey: k }))
      .filter((res) => res.typeDef !== undefined);
    if (resolvedCallers.length !== Object.values(input._inner).length) {
      throw new Error('[ERROR] Failed to resolve typeDef on a multiCaller inner node.');
    }
    const fnDataDefs = resolvedCallers.map(({ typeDef }) => typeDef!).join('\n\n');

    // AnyCall is the union of all of the caller defs, with this we can use a dispatch pattern
    // and, given a function name, can call the appropriate single caller struct
    const anyCallRef = 'AnyCall';
    const anyCallDef = `using ${anyCallRef} = std::variant<${resolvedCallers.map((c) => c.typeRef).join(', ')}>;`;

    // this is what the final parser will actually read into; the input be an array of:
    // - `{ fnName: string, inputs: ..., expect: <expected value> }`
    // and we dispatch based on fnName and run that function with its data
    const dataDef = `std::vector<${anyCallRef}> data;`;

    // this is the method to call the overall multicaller. It returns a result
    // indicating how many test cases passed/failed. This can be unchanged for any
    // multicaller since we made the abi consistent with call() on singleCallers
    const runImpl = [
      `std::expected<std::string, std::string> call() {`,
      `  size_t N = data.size();`,
      `  for (size_t i = 0; i < N; i++) {`,
      `    auto res = std::visit([&](auto& d) { return d.call(storage); }, data[i]);`,
      `    if (!res) {`,
      `      return std::unexpected(std::format("[FAIL] Failed on test case {}/{}.\\n", i+1, N));`,
      `    }`,
      `  }`,
      `  return std::format("[PASS] {}/{} test cases were successful.\\n", N, N);`,
      `}`,
    ].join('\n');

    // overall multi-caller definition
    const multiCallerDef = [
      `struct ${input._name} {`,
      indent(storageDef),
      indent(fnDataDefs),
      indent(anyCallDef),
      indent(dataDef),
      indent(runImpl),
      `};\n`,
    ].join('\n');

    // glz meta stints so it can be parsed
    const stint = [
      `template <>`,
      `struct glz::meta<${input._name}::${anyCallRef}> {`,
      `  static constexpr std::string_view tag = "fn";`,
      `  static constexpr auto ids = std::array{${fnNames.map((n) => `"${n}"`).join(', ')}};`,
      `};`,
      ``,
      `template<>`,
      `struct glz::meta<${input._name}::Storage::key_t> {`,
      `  using enum ${input._name}::Storage::key_t;`,
      `  static constexpr auto value = glz::enumerate(${storageKeys.join(', ')});`,
      `};`,
    ].join('\n');

    return {
      typeRef: input._name,
      typeDef: [multiCallerDef, stint].join('\n'),
      dec: `struct ${input._name};`,
      doc: applySlashComment(input._desc),
    };
  },
  python: (input, callHandler) => {
    const typeRef = input._name;
    const callers = Object.entries(input._inner).map(([k, v]) => ({
      storageKey: k,
      fnName: v._inner._name,
      resolved: callHandler({ ...v, _useStorageKey: k }),
    }));

    // associate function names w/ parsers for lookup table
    const fnLookupInner = callers
      .map(({ fnName, resolved }) => `"${fnName}": ${resolved.typeRef}`)
      .join(', ');
    const fnLookupRef = 'fnLookup';
    const fnLookupDef = `${fnLookupRef} = { ${fnLookupInner} }`;
    const returnTypeRef = 'MultiResult';
    const errPrefix = `"[${typeRef}] "`;

    const typeDef = [
      `def ${typeRef}(**kwargs) -> Expected[${returnTypeRef}]:`,
      `  data = kwargs.pop("data", None)`,
      `  storage = kwargs.pop("storage", {})`,
      `  if not isinstance(data, (list,tuple)) and len(data) > 0:`,
      `    return Expected.fail("data must be non-empty list", prefix=${errPrefix})`,
      indent(callers.map((c) => c.resolved.typeDef).join('\n\n')),
      `  ${fnLookupDef}`,
      `  m = ${returnTypeRef}()`,
      `  for i, caller_kwargs in enumerate(data):`,
      `    fn = caller_kwargs.pop("fn", None)`,
      `    if (not isinstance(fn, str)) or (fn not in ${fnLookupRef}):`,
      `      return Expected.fail(f"data index {i} has invalid or missing 'fn'", prefix=${errPrefix})`,
      `    caller = ${fnLookupRef}[fn]`,
      `    caller_result = caller(storage=storage, **caller_kwargs)`,
      `    if caller_result.error:`,
      `      return Expected.fail(f"call failed on data[{i}] ('fn': {fn})", cause=caller_result, prefix=${errPrefix})`,
      `    result = caller_result.value`,
      `    m.results.append(result)`,
      `    if result.passed:`,
      `      m.num_passed += 1`,
      `    else:`,
      `      m.all_passed = False`,
      '',
      `  return Expected.ok(m)`,
    ].join('\n');

    return { typeDef, typeRef };
  },
  zod: (input, callHandler, refMap) => {
    const storageSchemaShape = Object.fromEntries(
      Object.entries(input._inner)
        .filter(([_, node]) => !!node._inner._inner._out)
        .map(([skey, node]) => {
          // the storage schema will consist of every storage key
          // mapped to its respective function's return type. Each
          // entry will be optional schema because it is not required
          // to initialize the entire storage object
          const fnOut = node._inner._inner._out!;
          const outSchema = callHandler(fnOut, refMap).zData;
          return [skey, z.optional(outSchema)] as const;
        }),
    );

    // the storage schema must only include keys that are actually
    // valid keys, so we make it strict; but the storage object itself
    // does not have to be initialized at all -- just prevents you from
    // trying to initialize an invalid storage key by accident
    const storageSchema = z.optional(
      z
        .object({
          ...storageSchemaShape,
        })
        .strict(),
    );
    // union of all storage keys
    const anySkey = z.union(Object.keys(storageSchemaShape).map((k) => z.literal(k)));
    const storageRefSchema = z.object({ _storageKey: anySkey });

    const callerSchemas = Object.values(input._inner).map((node) => {
      // note, we can do this to get better type inference. Future feature might be to do it on callHandler
      const nodeSchema = singleCallerHandlers.zod(node, callHandler, refMap).zData;

      const newShape = Object.fromEntries(
        Object.entries(nodeSchema.shape).map(([k, schema]) => {
          return [k, z.union([schema, storageRefSchema])] as const;
        }),
      );

      const callerSchema = z.object({
        ...newShape,
        // on a multi caller, all of the single callers are part of a discriminated union where
        // the associated function name of the single caller is the discriminant property. 'fn' serves that role
        fn: z.literal(node._inner._name),
      });
      return callerSchema;
    });
    type caller_t = (typeof callerSchemas)[number];
    const dataSchema = z.array(
      z.discriminatedUnion('fn', callerSchemas as [caller_t, ...caller_t[]]),
    );

    // final schema: a multicaller allows optional/partial initialization of its storage object,
    // and requires the data object which is just an array of function calls
    const zData = z
      .object({
        storage: storageSchema,
        data: dataSchema,
      })
      .strict();
    return { zData };
  },
} satisfies Partial<PlatformTypeHandlerMap>['multiCaller'];
