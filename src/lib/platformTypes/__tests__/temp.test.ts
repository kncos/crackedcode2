import { test } from 'vitest';
import { parseSchema } from '../../typesDSL/parser';
import { getPlatformRegistry } from '../definitions';

const addSubInput = [
  {
    _type: 'multiCaller',
    _name: 'testSuite',
    _inner: {
      addOut: {
        _type: 'singleCaller',
        _name: 'addCaller',
        _inner: {
          _type: 'function',
          _name: 'add',
          _inner: { _in: { a: { _type: 'i32' }, b: { _type: 'i32' } }, _out: { _type: 'i32' } },
        },
      },
      subOut: {
        _type: 'singleCaller',
        _name: 'subCaller',
        _inner: {
          _type: 'function',
          _name: 'sub',
          _inner: { _in: { a: { _type: 'i32' }, b: { _type: 'i32' } }, _out: { _type: 'i32' } },
        },
      },
    },
  },
];

test('codegen', () => {
  const { getAllTypesZodSchema, languageResolvers } = getPlatformRegistry();
  const graph = parseSchema({ input: addSubInput, types: getAllTypesZodSchema() });
  const deps = graph.topologicalSort();

  const stintDefs = [];
  const stintRefs = [];
  const typeDefs = [];

  for (const d of deps) {
    const n = graph.getNode(d)!;
    const res = languageResolvers.python(n);
    if (res.typeDef) typeDefs.push(res.typeDef);
    if (res.stintDef) stintDefs.push(res.stintDef);
    if (res.stintRef) stintRefs.push(res.stintRef);
  }

  console.log(stintDefs.join('\n\n'));
  console.log(typeDefs.join('\n\n'));
});
