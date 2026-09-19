import { describe, expect, test } from 'vitest';
import z from 'zod';
import { getBuiltinRegistry } from '../builtins';
import { parseSchema, TypeGraph } from '../parser';
import { createTypeSchema } from '../utils';

describe('Type Parser Test', () => {
  test('parser runs discriminated union on all nodes', () => {
    const zTest = z.discriminatedUnion('_type', [createTypeSchema('i8'), createTypeSchema('i16')]);

    const s1 = [
      { _type: 'i8', _name: 'r1' },
      { _type: 'i16', _name: 'r2' },
    ];
    const s2 = [{ _type: 'i32', _name: 'r1' }];
    expect(parseSchema({ input: s1, types: zTest })).toBeInstanceOf(TypeGraph);
    expect(() => parseSchema({ input: s2, types: zTest })).toThrow();
  });

  test('parser detects self reference', () => {
    const types = getBuiltinRegistry().getAllTypesZodSchema();
    const input = [
      {
        _name: 'linkedList',
        _type: 'object',
        _inner: {
          next: {
            _type: 'ref',
            _ref: 'linkedList',
          },
        },
      },
    ];
    expect(() => parseSchema({ input, types })).toThrow(/Cyclical reference/);
  });

  test('self reference broken by nullable', () => {
    const types = getBuiltinRegistry().getAllTypesZodSchema();
    const input = [
      {
        _name: 'linkedList',
        _type: 'object',
        _inner: {
          next: {
            _type: 'nullable',
            _inner: {
              _type: 'ref',
              _ref: 'linkedList',
            },
          },
        },
      },
    ];
    parseSchema({ input, types });
  });

  test('parser detects undefined reference', () => {
    const types = getBuiltinRegistry().getAllTypesZodSchema();
    const input = [
      {
        _name: 'A',
        _type: 'object',
        _inner: {
          b: {
            _type: 'ref',
            _ref: 'B',
          },
        },
      },
    ];
    expect(() => parseSchema({ input, types })).toThrow(/Undefined reference/);
  });

  test('parser detects node with both _ref and _name', () => {
    const types = getBuiltinRegistry().getAllTypesZodSchema();
    const input = [
      {
        _name: 'A',
        _type: 'object',
        _inner: {
          b: {
            _type: 'ref',
            _name: 'namedRefIsInvalid',
            _ref: 'B',
          },
        },
      },
      {
        _name: 'B',
        _type: 'object',
        _inner: {
          val: { _type: 'i8' },
        },
      },
    ];
    expect(() => parseSchema({ input, types })).toThrow(/both _name and _ref/);
  });

  test('parser detects attempt to redefine previously defined named node', () => {
    const types = getBuiltinRegistry().getAllTypesZodSchema();
    const input = [
      {
        _name: 'A',
        _type: 'object',
        _inner: {
          val: { _type: 'f64' },
        },
      },
      {
        _name: 'A',
        _type: 'object',
        _inner: {
          val: { _type: 'i8' },
        },
      },
    ];
    expect(() => parseSchema({ input, types })).toThrow(/redefine node with name A/);
  });

  test('parser detects disallowed root node type', () => {
    const schema = createTypeSchema('not_root').extend({
      _disallowRoot: z.optional(z.literal(true)).default(true),
    });
    const types = z.discriminatedUnion('_type', [schema]);
    const input = [
      {
        _name: 'BadRoot',
        _type: 'not_root',
      },
    ];

    expect(() => parseSchema({ input, types })).toThrow(/_disallowRoot found as root/);
  });

  test('parser detects undefine root node', () => {
    const types = getBuiltinRegistry().getAllTypesZodSchema();
    const input = [undefined];
    // @ts-expect-error - input purposefully has undefined root node for the test case
    expect(() => parseSchema({ input, types })).toThrow(/Failed to parse root/);
  });

  test('parser detects undefined types schema', () => {
    // const types = builtinTypeRegistry.getAllTypesZodSchema();
    const input = [{}];
    // @ts-expect-error - purposefully invalid props
    expect(() => parseSchema({ input, types: undefined })).toThrow(/undefined types schema/);
  });

  test('parser dependency ordering seems to be correct', () => {
    const types = getBuiltinRegistry().getAllTypesZodSchema();
    const input = [
      {
        // A depends on B depends on D
        _type: 'object',
        _name: 'A',
        _inner: {
          b: {
            _type: 'object',
            _name: 'B',
            _inner: {
              val: {
                _type: 'ref',
                _ref: 'D',
              },
            },
          },
        },
      },
      // C depends on D
      {
        _type: 'object',
        _name: 'C',
        _inner: {
          d: {
            _type: 'object',
            _name: 'D',
            _inner: {
              dval: {
                _type: 'u32',
              },
            },
          },
        },
      },
    ];
    // Dependency ordering:
    // - D comes before A, B, or C,
    // - B comes before A
    const graph = parseSchema({ input, types });
    const order = graph.topologicalSort();
    expect(order.indexOf('D')).toBeLessThan(order.indexOf('A'));
    expect(order.indexOf('D')).toBeLessThan(order.indexOf('B'));
    expect(order.indexOf('D')).toBeLessThan(order.indexOf('C'));
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('A'));
  });
});
