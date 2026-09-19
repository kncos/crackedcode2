import z from 'zod';
import { applyHashComment } from '../../typesDSL/utils';
import type { PlatformTypeHandlerMap } from './index';

export const linkedListHandlers = {
  cpp: (node, getHandler) => {
    const inner = getHandler(node._inner);
    const defLines = [
      `struct ${node._name} {`,
      `  ${inner.typeRef} val;`,
      `  ${node._name}* next;`,
      `};`,
    ];
    const stintLines = [
      `template <>`,
      `struct glz::meta<${node._name}*> {`,
      `  static constexpr auto deserialize_fn =`,
      `    [](${node._name}*& target, std::vector<${inner.typeRef}>& data) {`,
      `      if (data.empty()) {`,
      `        target = nullptr;`,
      `        return;`,
      `      }`,
      `      auto* head = new ${node._name}{.val=data[0], .next=nullptr};`,
      `      ${node._name}* cur = head;`,
      `      for (size_t i = 1; i < data.size(); i++) {`,
      `        cur->next = new ${node._name}{.val=data[i], .next=nullptr};`,
      `        cur = cur->next;`,
      `      }`,
      `      target = head;`,
      `  };`,
      `  static constexpr auto serialize_fn =`,
      `    [](${node._name}* const& source) -> std::vector<${inner.typeRef}> {`,
      `      std::vector<${inner.typeRef}> result;`,
      `      ${node._name}* cur = source;`,
      `      while (cur) {`,
      `        result.push_back(cur->val);`,
      `        cur = cur->next;`,
      `      }`,
      `      return result;`,
      `  };`,
      `  static constexpr auto value =`,
      `    glz::custom<deserialize_fn, serialize_fn>;`,
      `};`,
    ];

    return {
      typeRef: node._name,
      dec: `struct ${node._name};`,
      typeDef: defLines.join('\n'),
      stintDef: stintLines.join('\n'),
      doc: defLines.map((l) => `// ${l}`).join('\n'),
    };
  },
  python: (node, getHandler) => {
    const inner = getHandler(node._inner);
    const name = node._name!;
    const parseFnName = `parse${name}`;

    const classDef = [
      `class ${name}:`,
      `  __slots__ = ('val', 'next')`,
      `  def __init__(self, val, next=None):`,
      `    self.val = val`,
      `    self.next = next`,
    ].join('\n');
    const parseDef = [
      `def ${parseFnName}(data):`,
      `  it = list(data)`,
      `  if not it:`,
      `    return None`,
      `  head = ${name}(${inner.stintRef}(it[0]))`,
      `  cur = head`,
      `  for i in range(1, len(it)):`,
      `    cur.next = ${name}(${inner.stintRef}(it[i]))`,
      `    cur = cur.next`,
      `  return head`,
    ].join('\n');

    return {
      typeRef: name,
      typeDef: classDef,
      stintRef: parseFnName,
      stintDef: parseDef,
      doc: applyHashComment(classDef),
    };
  },
  zod: (node, callHandler, refmap) => {
    // linked lists are just encoded as arrays
    const zData = z.array(callHandler(node._inner, refmap).zData);
    if (node._name) {
      refmap.set(node._name, zData);
    }
    return { zData };
  },
} satisfies Partial<PlatformTypeHandlerMap>['linkedList'];
