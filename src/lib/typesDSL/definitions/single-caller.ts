import z from 'zod';
import { builtinSchemas } from '../../typesDSL/builtins';
import { HandlerResult } from '../../typesDSL/codec';
import { applyHashComment, applySlashComment, indent, NodeLike } from '../../typesDSL/utils';
import type { PlatformTypeHandlerMap } from './index';

const EXPECT_KEY = 'expect' as const;
const PY_USR_CALLER = 'user_fn_caller' as const;

type FnAbiResult = {
  name: string;
  dec: string;
  params: { name: string; typeRef: string }[];
  output?: { name: '${EXPECT_KEY}'; typeRef: string };
};

type CallHandler = (input: NodeLike) => HandlerResult;

const fnAbiHelper = (
  fn: z.infer<typeof builtinSchemas.function>,
  callHandler: CallHandler,
): FnAbiResult => {
  // built inputs
  const resolved = callHandler(fn);
  const params: FnAbiResult['params'] = [];
  for (const [name, node] of Object.entries(fn._inner._in || {})) {
    const typeRef = callHandler(node).typeRef;
    params.push({ name, typeRef });
  }
  // optional output
  const output: FnAbiResult['output'] = fn._inner._out
    ? { name: '${EXPECT_KEY}', typeRef: callHandler(fn._inner._out).typeRef }
    : undefined;

  return {
    params,
    output,
    name: fn._name,
    dec: resolved.dec || '\/\/! failed to generate declaration',
  };
};

export const singleCallerHandlers = {
  cpp: (input, callHandler) => {
    const storageKey = input._useStorageKey;
    const addVariant = (input: string) =>
      storageKey ? `std::variant<${input}, Storage::keyref_t>` : input;

    const fnAbi = fnAbiHelper(input._inner, (node) => callHandler(node));
    // initialize storageProps with every fn parameter
    const props = fnAbi.params.map(({ name, typeRef }) => `${addVariant(typeRef)} ${name};`);
    // if a function has void return type, it makes no sense to have ${EXPECT_KEY}
    // since we can't compare its output with anything
    if (fnAbi.output) {
      const { typeRef, name } = fnAbi.output;
      props.push(`std::optional<${addVariant(typeRef)}> ${name};`);
    }

    const callImpl: string[] = [];

    // if we have storage, we have to resolve parameters; if not we can use them directly
    const refStorage = (input: string) => (storageKey ? `s.resolve(${input})` : input);

    // caller api depends on if we use storage keys for this
    callImpl.push(storageKey ? 'bool call(Storage& s) {' : 'bool call() {');
    callImpl.push(indent(fnAbi.dec));
    const fnCall = `${fnAbi.name}(${fnAbi.params.map((p) => refStorage(p.name)).join(', ')});`;

    // can only assign returned value if it is non-void
    callImpl.push(indent(fnAbi.output ? `auto res = ${fnCall}` : fnCall));

    // can only store and compare if returned value is non-void
    if (fnAbi.output) {
      if (storageKey) {
        callImpl.push(indent(`s.store(Storage::key_t::${storageKey}, res);`));
      }
      callImpl.push(indent(`if (${fnAbi.output.name}) {`));
      const expectRef = refStorage(`*${fnAbi.output.name}`);
      callImpl.push(indent(`return unwrap_equals(res, ${expectRef});`, 2));
      callImpl.push(indent('}'));
    }

    callImpl.push(indent('return true;'));
    callImpl.push('}');

    const callerDef = [
      `struct ${input._name} {`,
      indent(props.join('\n')),
      '',
      indent(callImpl.join('\n')),
      `};`,
    ].join('\n');

    return {
      typeRef: input._name,
      typeDef: callerDef,
      dec: `struct ${input._name};`,
      doc: applySlashComment(input._desc),
    };
  },
  python: (input, callHandler) => {
    const typeRef = input._name;

    const { _in, _out } = input._inner._inner;
    const resolvedInputs = Object.entries(_in || {}).map(([k, v]) => [k, callHandler(v)] as const);
    const resolvedOutput = _out ? callHandler(_out) : undefined;

    // stints will be the parser functions
    const parserLookupInner = resolvedInputs.map(([k, v]) => `"${k}": ${v.stintRef}`);
    if (resolvedOutput) parserLookupInner.push(`"${EXPECT_KEY}": ${resolvedOutput.stintRef}`);
    // build a dict that has the (paramName: parser) association
    const parserLookupRef = 'parserLookup';
    const parserLookupDef = `${parserLookupRef} = { ${parserLookupInner.join(', ')} }`;

    // this is just for the generated fn return type
    const out_t = resolvedOutput?.typeRef || 'None';

    const fnName = input._inner._name;
    const errPrefix = `"[${typeRef}] "`;
    const stoargeKey = input._useStorageKey || 'None';

    const typeDef = [
      `def ${typeRef}(**kwargs) -> Expected[ExecutorResult[${out_t}]]:`,
      `  if not isinstance(kwargs, dict):`,
      `    return Expected.fail(f"kwargs is not a dict", prefix=${errPrefix})`,
      `  `,
      `  storageKey = kwargs.pop("storageKey", "${stoargeKey}")`,
      `  storage = kwargs.pop("storage", {})`,
      `  ${parserLookupDef}`,
      `  fn_kwargs = {}`,
      `  for key, parse in ${parserLookupRef}.items():`,
      `    if key not in kwargs:`,
      `      return Expected.fail(f"'{key}' property is missing.", prefix=${errPrefix})`,
      `    val = fromStorage(kwargs[key], storage)`,
      `    if val.error:`,
      `      return Expected.fail("Failed to resolve storage", cause=val, prefix=${errPrefix})`,
      `    val = parse(val.value)`,
      `    if val.error:`,
      `      return Expected.fail(f"Failed to parse arg '{key}'", cause=val, prefix=${errPrefix})`,
      `    fn_kwargs[key] = val.value`,
      `  `,
      `  caller_result = ${PY_USR_CALLER}(${fnName}, **fn_kwargs)`,
      `  if caller_result.result.success and (storageKey is not None):`,
      `    toStorage(caller_result.result.value, storage, storageKey)`,
      `  return Expected.ok(caller_result)`,
      '',
    ].join('\n');

    return { typeRef, typeDef, doc: applyHashComment(input._desc) };
  },
  zod: (input, callHandler, refMap) => {
    const { _in, _out } = input._inner._inner;

    const resolvedInputs = Object.fromEntries(
      Object.entries(_in || {}).map(([k, v]) => [k, callHandler(v, refMap).zData] as const),
    );
    const resolvedOutput = _out ? callHandler(_out, refMap).zData : undefined;

    // function call data is just an object with the function args and expected output
    const zData = z
      .object({
        ...resolvedInputs,
        ...(resolvedOutput ? { [EXPECT_KEY]: resolvedOutput } : {}),
      })
      .strict();
    refMap.set(input._name, zData);
    return { zData };
  },
} satisfies Partial<PlatformTypeHandlerMap>['singleCaller'];
