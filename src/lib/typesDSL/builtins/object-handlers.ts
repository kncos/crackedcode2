import z from 'zod';
import { BuiltinTypeHandlerMap } from '.';
import { applyHashComment, indent } from '../utils';

export const objectHandlers = {
  object: {
    cpp: (input, callHandler) => {
      const entries = Object.entries(input._inner).map(([propName, node]) => ({
        propName,
        ref: callHandler(node).typeRef,
      }));
      return {
        typeRef: input._name,
        typeDef: [
          `struct ${input._name} {`,
          ...entries.map(({ propName, ref }) => `  ${ref} ${propName};`),
          `};`,
        ].join('\n'),
      };
    },
    python: (input, callHandler) => {
      const props = Object.keys(input._inner);
      const resolved = Object.values(input._inner).map((v) => callHandler(v));
      const stintRef = `parse${input._name}`;
      return {
        typeRef: input._name,
        typeDef: [
          `class ${input._name}:`,
          // the `,` is in the map instead of the join because we need the trailing comma to tell python its a tuple
          indent(`__slots__ = (${props.map((p) => `"${p}",`).join('')})`),
          indent(`def __init__(self, ${props.map((p) => `${p}=None`).join(', ')}):`),
          // pass so syntax is valid if there are no strings
          indent(props.map((p) => `self.${p} = ${p}`).join('\n') || 'pass', 2),
        ].join('\n'),
        stintRef,
        stintDef: `def ${stintRef}(x) -> Expected[${input._name}]: return parseObject(x, [${resolved.map((r) => r.stintRef).join(', ')}], ${input._name})`,
        doc: applyHashComment(input._desc),
      };
    },
    zod: (input, callHandler, refmap) => {
      const shape = Object.fromEntries(
        Object.entries(input._inner).map(([propName, node]) => [
          propName,
          callHandler(node, refmap).zData,
        ]),
      );
      const objSchema = z.object(shape);
      if (input._name) refmap.set(input._name, objSchema);
      return { zData: objSchema };
    },
  },
} as const satisfies Partial<BuiltinTypeHandlerMap>;
