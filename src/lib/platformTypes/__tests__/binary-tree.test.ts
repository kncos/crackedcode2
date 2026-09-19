import { NodeLike } from '@/lib/typesDSL/utils';
import { assert, describe, test } from 'vitest';
import { ZodType } from 'zod';
import { getPlatformTypes } from '..';
import { parseSchema } from '../../typesDSL/parser';

const buildRefMap = (input: NodeLike[]) => {
  const types = getPlatformTypes();
  const graph = parseSchema({ input, types: types.getAllTypesZodSchema() });
  const refMap = new Map<string, ZodType>();
  for (const dep of graph.topologicalSort()) {
    const schema = types.languageResolvers.zod(graph.getNode(dep)!, refMap);
    refMap.set(dep, schema.zData);
  }
  return refMap;
};

describe('binaryTree zod', () => {
  test('accepts an array of the inner type (level-order serialisation)', () => {
    const zData = buildRefMap([
      { _type: 'binaryTree', _name: 'IntTree', _inner: { _type: 'i32' } },
    ]).get('IntTree')!;

    assert.isTrue(zData.safeParse([1, 2, 3, 4, 5]).success);
    assert.isTrue(zData.safeParse([]).success);
  });

  test('rejects elements of the wrong type', () => {
    const zData = buildRefMap([
      { _type: 'binaryTree', _name: 'IntTree', _inner: { _type: 'i32' } },
    ]).get('IntTree')!;

    assert.isFalse(zData.safeParse([1, 'two']).success);
    assert.isFalse(zData.safeParse(null).success);
  });

  test('inner type constraints are enforced', () => {
    const zData = buildRefMap([
      { _type: 'binaryTree', _name: 'BoolTree', _inner: { _type: 'bool' } },
    ]).get('BoolTree')!;

    assert.isTrue(zData.safeParse([true, false, true]).success);
    assert.isFalse(zData.safeParse([true, 1, false]).success, 'number should not pass as bool');
  });
});
