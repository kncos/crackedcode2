import { assert, describe, test } from 'vitest';
import { getBuiltinRegistry } from '../builtins';
import { parseSchema } from '../parser';
import { NodeLike } from '../utils';

// Helper: build a zod schema for a single named root node from an input array.
const resolve = (input: NodeLike[]) => {
  const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
  const graph = parseSchema({ input, types: getAllTypesZodSchema() });
  return { graph, languageResolvers };
};

describe('builtin containers zod', () => {
  describe('array', () => {
    test('accepts an array of the inner type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'array', _name: 'i32arr', _inner: { _type: 'i32' } },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('i32arr')!, new Map());

      const res = zData.safeParse([0, 1, -1, 2147483647, -2147483648]);
      assert.isTrue(res.success);
      assert.deepEqual(res.data, [0, 1, -1, 2147483647, -2147483648]);
    });

    test('accepts an empty array', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'array', _name: 'strarr', _inner: { _type: 'string' } },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('strarr')!, new Map());

      const res = zData.safeParse([]);
      assert.isTrue(res.success);
      assert.deepEqual(res.data, []);
    });

    test('rejects elements of the wrong type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'array', _name: 'boolarr', _inner: { _type: 'bool' } },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('boolarr')!, new Map());

      assert.isFalse(zData.safeParse([true, 'oops', false]).success);
      assert.isFalse(zData.safeParse('not an array').success);
      assert.isFalse(zData.safeParse(42).success);
    });

    test('ref - array of a named primitive type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'i16', _name: 'my_i16' },
        { _type: 'array', _name: 'i16arr', _inner: { _type: 'ref', _ref: 'my_i16' } },
      ]);
      const refmap = new Map();
      // resolve the primitive first so the ref is populated
      languageResolvers.zod(graph.getNode('my_i16')!, refmap);
      const { zData } = languageResolvers.zod(graph.getNode('i16arr')!, refmap);

      const res = zData.safeParse([0, 100, -32768, 32767]);
      assert.isTrue(res.success);
      assert.isFalse(zData.safeParse([0, 32768]).success, 'out-of-range i16 should be rejected');
    });
  });

  describe('nullable', () => {
    test('accepts the inner type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'nullable', _name: 'nstr', _inner: { _type: 'string' } },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('nstr')!, new Map());

      assert.equal(zData.safeParse('hello').data, 'hello');
    });

    test('accepts null', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'nullable', _name: 'nstr', _inner: { _type: 'string' } },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('nstr')!, new Map());

      assert.isNull(zData.safeParse(null).data);
    });

    test('rejects undefined and wrong types', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'nullable', _name: 'nbool', _inner: { _type: 'bool' } },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('nbool')!, new Map());

      assert.isFalse(zData.safeParse(undefined).success);
      assert.isFalse(zData.safeParse('true').success);
      assert.isFalse(zData.safeParse(1).success);
    });

    test('ref - nullable of a named type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'u8', _name: 'my_u8' },
        { _type: 'nullable', _name: 'nu8', _inner: { _type: 'ref', _ref: 'my_u8' } },
      ]);
      const refmap = new Map();
      languageResolvers.zod(graph.getNode('my_u8')!, refmap);
      const { zData } = languageResolvers.zod(graph.getNode('nu8')!, refmap);

      assert.isNull(zData.safeParse(null).data);
      assert.equal(zData.safeParse(255).data, 255);
      assert.isFalse(zData.safeParse(256).success, '256 exceeds u8 max');
    });
  });

  describe('optional', () => {
    test('accepts the inner type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'optional', _name: 'ostr', _inner: { _type: 'string' } },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('ostr')!, new Map());

      assert.equal(zData.safeParse('hello').data, 'hello');
    });

    test('accepts undefined', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'optional', _name: 'ostr', _inner: { _type: 'string' } },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('ostr')!, new Map());

      assert.isUndefined(zData.safeParse(undefined).data);
    });

    test('rejects null and wrong types', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'optional', _name: 'obool', _inner: { _type: 'bool' } },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('obool')!, new Map());

      assert.isFalse(zData.safeParse(null).success);
      assert.isFalse(zData.safeParse('true').success);
      assert.isFalse(zData.safeParse(0).success);
    });

    test('ref - optional of a named type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'char', _name: 'my_char' },
        { _type: 'optional', _name: 'ochar', _inner: { _type: 'ref', _ref: 'my_char' } },
      ]);
      const refmap = new Map();
      languageResolvers.zod(graph.getNode('my_char')!, refmap);
      const { zData } = languageResolvers.zod(graph.getNode('ochar')!, refmap);

      assert.isUndefined(zData.safeParse(undefined).data);
      assert.equal(zData.safeParse('x').data, 'x');
      assert.isFalse(zData.safeParse('xy').success, 'multi-char string should be rejected');
    });
  });

  describe('map', () => {
    test('accepts a record with values of the inner type', () => {
      const { graph, languageResolvers } = resolve([
        // map<string, i32> — key type is always coerced to string by zod
        { _type: 'map', _name: 'strmap', _inner: [{ _type: 'string' }, { _type: 'i32' }] },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('strmap')!, new Map());

      const res = zData.safeParse({ a: 1, b: -1, c: 2147483647 });
      assert.isTrue(res.success);
      assert.deepEqual(res.data, { a: 1, b: -1, c: 2147483647 });
    });

    test('accepts an empty record', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'map', _name: 'emptymap', _inner: [{ _type: 'string' }, { _type: 'bool' }] },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('emptymap')!, new Map());

      assert.isTrue(zData.safeParse({}).success);
    });

    test('rejects values of the wrong type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'map', _name: 'boolmap', _inner: [{ _type: 'string' }, { _type: 'bool' }] },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('boolmap')!, new Map());

      assert.isFalse(zData.safeParse({ a: 'not a bool' }).success);
      assert.isFalse(zData.safeParse([1, 2, 3]).success);
      assert.isFalse(zData.safeParse('string').success);
    });

    test('ref - map with a named value type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'u8', _name: 'score' },
        {
          _type: 'map',
          _name: 'scoremap',
          _inner: [{ _type: 'string' }, { _type: 'ref', _ref: 'score' }],
        },
      ]);
      const refmap = new Map();
      languageResolvers.zod(graph.getNode('score')!, refmap);
      const { zData } = languageResolvers.zod(graph.getNode('scoremap')!, refmap);

      assert.isTrue(zData.safeParse({ alice: 100, bob: 0 }).success);
      assert.isFalse(zData.safeParse({ alice: 256 }).success, '256 exceeds u8 max');
    });
  });

  describe('variant', () => {
    test('accepts any of the listed types', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'variant', _name: 'sv', _inner: [{ _type: 'string' }, { _type: 'bool' }] },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('sv')!, new Map());

      assert.equal(zData.safeParse('hello').data, 'hello');
      assert.equal(zData.safeParse(true).data, true);
      assert.equal(zData.safeParse(false).data, false);
    });

    test('rejects values that match none of the types', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'variant', _name: 'sv', _inner: [{ _type: 'string' }, { _type: 'bool' }] },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('sv')!, new Map());

      assert.isFalse(zData.safeParse(42).success);
      assert.isFalse(zData.safeParse(null).success);
      assert.isFalse(zData.safeParse([]).success);
    });

    test('ref - variant including a named type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'i32', _name: 'my_i32' },
        {
          _type: 'variant',
          _name: 'sv',
          _inner: [{ _type: 'ref', _ref: 'my_i32' }, { _type: 'string' }],
        },
      ]);
      const refmap = new Map();
      languageResolvers.zod(graph.getNode('my_i32')!, refmap);
      const { zData } = languageResolvers.zod(graph.getNode('sv')!, refmap);

      assert.equal(zData.safeParse('text').data, 'text');
      assert.equal(zData.safeParse(0).data, 0);
      assert.isFalse(zData.safeParse(null).success);
    });
  });

  describe('tuple', () => {
    test('accepts a correctly typed and sized array', () => {
      const { graph, languageResolvers } = resolve([
        {
          _type: 'tuple',
          _name: 't3',
          _inner: [{ _type: 'i32' }, { _type: 'string' }, { _type: 'bool' }],
        },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('t3')!, new Map());

      const res = zData.safeParse([42, 'hello', true]);
      assert.isTrue(res.success);
      assert.deepEqual(res.data, [42, 'hello', true]);
    });

    test('rejects wrong element types', () => {
      const { graph, languageResolvers } = resolve([
        {
          _type: 'tuple',
          _name: 't3',
          _inner: [{ _type: 'i32' }, { _type: 'string' }, { _type: 'bool' }],
        },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('t3')!, new Map());

      // wrong type at position 0
      assert.isFalse(zData.safeParse(['not a number', 'hello', true]).success);
      // wrong type at position 2
      assert.isFalse(zData.safeParse([42, 'hello', 'not a bool']).success);
    });

    test('rejects tuples with wrong length', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'tuple', _name: 't2', _inner: [{ _type: 'i32' }, { _type: 'string' }] },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('t2')!, new Map());

      assert.isFalse(zData.safeParse([42]).success, 'too few elements');
      assert.isFalse(zData.safeParse([42, 'hello', 'extra']).success, 'too many elements');
      assert.isFalse(zData.safeParse([]).success, 'empty array');
    });

    test('positional types are enforced independently', () => {
      // tuple<bool, i32, string> — each position has a distinct type
      const { graph, languageResolvers } = resolve([
        {
          _type: 'tuple',
          _name: 'tpos',
          _inner: [{ _type: 'bool' }, { _type: 'i32' }, { _type: 'string' }],
        },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('tpos')!, new Map());

      // correct order
      assert.isTrue(zData.safeParse([true, 0, 'x']).success);
      // swapped positions 0 and 2
      assert.isFalse(zData.safeParse(['x', 0, true]).success);
      // swapped positions 0 and 1
      assert.isFalse(zData.safeParse([0, true, 'x']).success);
    });

    test('empty tuple', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'tuple', _name: 'tempty', _inner: [] },
      ]);
      const { zData } = languageResolvers.zod(graph.getNode('tempty')!, new Map());

      assert.isTrue(zData.safeParse([]).success);
      assert.isFalse(zData.safeParse([1]).success);
    });

    test('ref - tuple with a named element type', () => {
      const { graph, languageResolvers } = resolve([
        { _type: 'f64', _name: 'coord' },
        {
          _type: 'tuple',
          _name: 'point2d',
          _inner: [
            { _type: 'ref', _ref: 'coord' },
            { _type: 'ref', _ref: 'coord' },
          ],
        },
      ]);
      const refmap = new Map();
      languageResolvers.zod(graph.getNode('coord')!, refmap);
      const { zData } = languageResolvers.zod(graph.getNode('point2d')!, refmap);

      assert.isTrue(zData.safeParse([1.5, -2.5]).success);
      assert.isFalse(zData.safeParse([1.5]).success, 'too few elements');
      assert.isFalse(zData.safeParse([1.5, 'not a float']).success);
    });
  });
});
