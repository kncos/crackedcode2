import { assert, describe, test } from 'vitest';
import { getBuiltinRegistry } from '../builtins';
import { parseSchema } from '../parser';

describe('builtin object zod', () => {
  test('accepts a valid object with all primitive field types', () => {
    // One field per primitive type, plus a ref field.
    const input = [
      { _type: 'i32', _name: 'ref_i32' },
      {
        _type: 'object',
        _name: 'AllPrims',
        _inner: {
          a_i8: { _type: 'i8' },
          b_u8: { _type: 'u8' },
          c_i16: { _type: 'i16' },
          d_u16: { _type: 'u16' },
          e_i32: { _type: 'i32' },
          f_u32: { _type: 'u32' },
          g_i64: { _type: 'i64' },
          h_u64: { _type: 'u64' },
          i_f64: { _type: 'f64' },
          j_bool: { _type: 'bool' },
          k_char: { _type: 'char' },
          l_str: { _type: 'string' },
          m_ref: { _type: 'ref', _ref: 'ref_i32' },
        },
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const refmap = new Map();

    // Resolve the named primitive so the ref can be looked up.
    languageResolvers.zod(graph.getNode('ref_i32')!, refmap);
    const { zData } = languageResolvers.zod(graph.getNode('AllPrims')!, refmap);

    const valid = {
      a_i8: -128,
      b_u8: 255,
      c_i16: -32768,
      d_u16: 65535,
      e_i32: 2147483647,
      f_u32: 4294967295,
      g_i64: -(2n ** 63n),
      h_u64: 2n ** 64n - 1n,
      i_f64: 3.14,
      j_bool: true,
      k_char: 'z',
      l_str: 'hello world',
      m_ref: 0,
    };

    const res = zData.safeParse(valid);
    assert.isTrue(res.success);
    assert.deepEqual(res.data, valid);
  });

  test('rejects an object with a missing field', () => {
    const input = [
      {
        _type: 'object',
        _name: 'Point',
        _inner: {
          x: { _type: 'f64' },
          y: { _type: 'f64' },
        },
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const { zData } = languageResolvers.zod(graph.getNode('Point')!, new Map());

    assert.isFalse(zData.safeParse({ x: 1.0 }).success, 'missing y should fail');
    assert.isFalse(zData.safeParse({}).success, 'empty object should fail');
  });

  test('rejects an object with a field of the wrong type', () => {
    const input = [
      {
        _type: 'object',
        _name: 'Point',
        _inner: {
          x: { _type: 'f64' },
          y: { _type: 'f64' },
        },
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const { zData } = languageResolvers.zod(graph.getNode('Point')!, new Map());

    assert.isFalse(zData.safeParse({ x: 'not a number', y: 1.0 }).success);
    assert.isFalse(zData.safeParse({ x: null, y: 1.0 }).success);
  });

  test('rejects non-object inputs', () => {
    const input = [
      {
        _type: 'object',
        _name: 'Point',
        _inner: {
          x: { _type: 'f64' },
          y: { _type: 'f64' },
        },
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const { zData } = languageResolvers.zod(graph.getNode('Point')!, new Map());

    assert.isFalse(zData.safeParse(null).success);
    assert.isFalse(zData.safeParse([1.0, 2.0]).success);
    assert.isFalse(zData.safeParse('string').success);
    assert.isFalse(zData.safeParse(42).success);
  });

  test('ref - object field resolved via refmap', () => {
    const input = [
      { _type: 'string', _name: 'Username' },
      {
        _type: 'object',
        _name: 'User',
        _inner: {
          name: { _type: 'ref', _ref: 'Username' },
          score: { _type: 'u8' },
        },
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const refmap = new Map();

    languageResolvers.zod(graph.getNode('Username')!, refmap);
    const { zData } = languageResolvers.zod(graph.getNode('User')!, refmap);

    assert.isTrue(zData.safeParse({ name: 'alice', score: 100 }).success);
    assert.isFalse(zData.safeParse({ name: 42, score: 100 }).success, 'name must be a string');
    assert.isFalse(zData.safeParse({ name: 'alice', score: 256 }).success, 'score exceeds u8 max');
  });

  test('nested object - object field containing another object', () => {
    const input = [
      {
        _type: 'object',
        _name: 'Inner',
        _inner: {
          value: { _type: 'i32' },
        },
      },
      {
        _type: 'object',
        _name: 'Outer',
        _inner: {
          label: { _type: 'string' },
          inner: { _type: 'ref', _ref: 'Inner' },
        },
      },
    ];

    const { languageResolvers, getAllTypesZodSchema } = getBuiltinRegistry();
    const graph = parseSchema({ input, types: getAllTypesZodSchema() });
    const refmap = new Map();

    languageResolvers.zod(graph.getNode('Inner')!, refmap);
    const { zData } = languageResolvers.zod(graph.getNode('Outer')!, refmap);

    assert.isTrue(zData.safeParse({ label: 'test', inner: { value: 42 } }).success);
    assert.isFalse(zData.safeParse({ label: 'test', inner: { value: 'wrong' } }).success);
    assert.isFalse(zData.safeParse({ label: 'test', inner: null }).success);
  });
});
