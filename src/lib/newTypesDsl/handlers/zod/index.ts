import z from "zod";
import { zn, ZN_PRIMITIVE_TYPE } from "../../nodes";
import { TypeGraph } from "../../typegraph";

const schemaMap = {
  i8: z.int().min(-128).max(127),
  i16: z.int().min(-32768).max(32767),
  i32: z.int32(),
  i64: z.int64(),
  u8: z.int().min(0).max(255),
  u16: z.int().min(0).max(65535),
  u32: z.uint32(),
  u64: z.uint64(),
  f64: z.number(),
  bool: z.boolean(),
  char: z.union([z.string().length(1), z.int().min(0).max(255)]),
  string: z.string(),
} as const satisfies Record<ZN_PRIMITIVE_TYPE, z.ZodType>;

export const zodHandler = (graph: TypeGraph<z.infer<typeof zn>>) => {
  const dependencies = graph.topologicalSort();

  for (const dep of dependencies) {
    const node = graph.getNode(dep)!;
  }

  throw new Error("unimplemented");
};
