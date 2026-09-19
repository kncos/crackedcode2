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

describe('linkedList zod', () => {
  test('accepts an array of the inner type', () => {
    const zData = buildRefMap([
      { _type: 'linkedList', _name: 'IntList', _inner: { _type: 'i32' } },
    ]).get('IntList')!;

    assert.isTrue(zData.safeParse([1, 2, 3]).success);
    assert.isTrue(zData.safeParse([]).success);
  });

  test('rejects elements of the wrong type', () => {
    const zData = buildRefMap([
      { _type: 'linkedList', _name: 'IntList', _inner: { _type: 'i32' } },
    ]).get('IntList')!;

    assert.isFalse(zData.safeParse([1, 'two', 3]).success);
    assert.isFalse(zData.safeParse('not an array').success);
  });

  test('inner type constraints are enforced', () => {
    const zData = buildRefMap([
      { _type: 'linkedList', _name: 'ByteList', _inner: { _type: 'u8' } },
    ]).get('ByteList')!;

    assert.isTrue(zData.safeParse([0, 128, 255]).success);
    assert.isFalse(zData.safeParse([0, 256]).success, '256 exceeds u8 max');
    assert.isFalse(zData.safeParse([-1, 0]).success, 'negative value in unsigned list');
  });
});
