import { test } from 'vitest';
import { getBuiltinRegistry } from '../builtins';
import { parseSchema } from '../parser';

test('generate python utils', () => {
  const nodes = [
    {
      _type: 'object',
      _name: 'myObject',
      _inner: {
        a: { _type: 'i8' },
        b: { _type: 'i8' },
      },
    },
    {
      _type: 'function',
      _name: 'func',
      _inner: {
        _in: {
          a: { _type: 'i8' },
          b: { _type: 'i8' },
        },
        _out: {
          _type: 'i8',
        },
      },
    },
  ];

  const { getAllTypesZodSchema, languageResolvers } = getBuiltinRegistry();
  const typegraph = parseSchema({ input: nodes, types: getAllTypesZodSchema() });
  for (const dep of typegraph.topologicalSort()) {
    const resolved = languageResolvers.python(typegraph.getNode(dep)!);
    console.log(resolved.stintDef, '\n');
  }
});
