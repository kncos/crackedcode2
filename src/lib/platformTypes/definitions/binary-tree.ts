import z from 'zod';
import { applyHashComment } from '../../typesDSL/utils';
import type { PlatformTypeHandlerMap } from './index';

export const binaryTreeHandlers = {
  cpp: (node, callHandler) => {
    const inner = callHandler(node._inner);
    const defLines = [
      `struct ${node._name} {`,
      `  ${inner.typeRef} val;`,
      `  ${node._name}* left;`,
      `  ${node._name}* right;`,
      `};`,
    ];
    const stintLines = [
      `template <>`,
      `struct glz::meta<${node._name}*> {`,
      `  static constexpr auto deserialize_fn =`,
      `    [](${node._name}*& target, const std::vector<std::optional<${inner.typeRef}>>& data) {`,
      `      if (data.empty() || !data[0].has_value()) {`,
      `        target = nullptr;`,
      `        return;`,
      `      }`,
      `      `,
      `      target = new ${node._name}{.val=data[0].value(), .left=nullptr, .right=nullptr};`,
      `      std::queue<${node._name}*> q;`,
      `      q.push(target);`,
      `      `,
      `      size_t i = 1;`,
      `      while (!q.empty() && i < data.size()) {`,
      `        ${node._name}* current = q.front();`,
      `        q.pop();`,
      `        `,
      `        if (i < data.size()) {`,
      `          if (data[i].has_value()) {`,
      `            current->left = new ${node._name}{.val=data[i].value(), .left=nullptr, .right=nullptr};`,
      `            q.push(current->left);`,
      `          }`,
      `          i++;`,
      `        }`,
      `        `,
      `        if (i < data.size()) {`,
      `          if (data[i].has_value()) {`,
      `            current->right = new ${node._name}{.val=data[i].value(), .left=nullptr, .right=nullptr};`,
      `            q.push(current->right);`,
      `          }`,
      `          i++;`,
      `        }`,
      `      }`,
      `  };`,
      `  static constexpr auto serialize_fn =`,
      `    [](${node._name}* const& source) -> std::vector<std::optional<${inner.typeRef}>> {`,
      `      std::vector<std::optional<${inner.typeRef}>> result;`,
      `      `,
      `      if (source == nullptr) {`,
      `        return result;`,
      `      }`,
      `      `,
      `      std::queue<${node._name}*> q;`,
      `      q.push(source);`,
      `      `,
      `      while (!q.empty()) {`,
      `        ${node._name}* current = q.front();`,
      `        q.pop();`,
      `        `,
      `        if (current == nullptr) {`,
      `          result.push_back(std::nullopt);`,
      `        } else {`,
      `          result.push_back(current->val);`,
      `          q.push(current->left);`,
      `          q.push(current->right);`,
      `        }`,
      `      }`,
      `      `,
      `      while (!result.empty() && !result.back().has_value()) {`,
      `        result.pop_back();`,
      `      }`,
      `      `,
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
  python: (node, callHandler) => {
    const inner = callHandler(node._inner);
    const name = node._name;
    const parseFnName = `parse${name}`;

    const classDef = [
      `class ${name}:`,
      `  __slots__ = ('val', 'left', 'right')`,
      `  def __init__(self, val, left=None, right=None):`,
      `    self.val = val`,
      `    self.left = left`,
      `    self.right = right`,
    ].join('\n');

    const parseDef = [
      `def ${parseFnName}(data):`,
      `  it = list(data)`,
      `  if not it or it[0] is None:`,
      `    return None`,
      `  `,
      `  root = ${name}(${inner.stintRef}(it[0]))`,
      `  from collections import deque`,
      `  q = deque([root])`,
      `  i = 1`,
      `  while q and i < len(it):`,
      `    curr = q.popleft()`,
      `    if i < len(it):`,
      `      if it[i] is not None:`,
      `        curr.left = ${name}(${inner.stintRef}(it[i]))`,
      `        q.append(curr.left)`,
      `      i += 1`,
      `    if i < len(it):`,
      `      if it[i] is not None:`,
      `        curr.right = ${name}(${inner.stintRef}(it[i]))`,
      `        q.append(curr.right)`,
      `      i += 1`,
      `  return root`,
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
    // binary trees are just encoded as arrays
    const zData = z.array(callHandler(node._inner, refmap).zData);
    if (node._name) {
      refmap.set(node._name, zData);
    }
    return { zData };
  },
} satisfies Partial<PlatformTypeHandlerMap>['binaryTree'];
