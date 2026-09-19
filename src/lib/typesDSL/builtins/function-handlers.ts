import z from 'zod';
import { BuiltinTypeHandlerMap } from '.';

export const functionHandlers = {
  function: {
    cpp: (input, callHandler) => {
      const params = Object.entries(input._inner?._in ?? {}).map(([paramName, node]) => {
        const paramType = callHandler(node).typeRef;
        return `${paramType} ${paramName}`;
      });
      const returnType = input._inner?._out ? callHandler(input._inner._out).typeRef : 'void';
      const paramStr = params.join(', ');
      return {
        typeRef: input._name,
        dec: `${returnType} ${input._name}(${paramStr});`,
        impl: `${returnType} ${input._name}(${paramStr}) {\n\n}`,
      };
    },
    python: (input, callHandler) => {
      const params = Object.entries(input._inner?._in ?? {}).map(([paramName, node]) => {
        const paramType = callHandler(node).typeRef;
        return `${paramName}: ${paramType}`;
      });
      const returnType = input._inner?._out ? callHandler(input._inner._out).typeRef : 'None';
      const paramStr = params.join(', ');
      return {
        typeRef: input._name,
        impl: `def ${input._name}(${paramStr}) -> ${returnType}:\n  pass`,
      };
    },
    zod: (input, callHandler, refmap) => {
      //! note: we don't even *use* these here, but in case they generate references
      //! in the refmap that are critical elsewhere, we expand them anyways
      const { _in, _out } = input._inner;
      Object.values(_in || {}).map((n) => callHandler(n, refmap));
      if (_out) {
        callHandler(_out, refmap);
      }

      //! functions themselves only create declarations in this system, so the zod type is never
      const zData = z.never();
      refmap.set(input._name, zData);
      return { zData };
    },
  },
} as const satisfies Partial<BuiltinTypeHandlerMap>;
