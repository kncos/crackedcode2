import { CONTAINER_TYPE, PRIMITIVE_TYPE } from "../../nodes";

export const cppPrimitiveMap: Record<PRIMITIVE_TYPE, string> = {
  i8: "int8_t",
  i16: "int16_t",
  i32: "int32_t",
  i64: "int64_t",
  u8: "uint8_t",
  u16: "uint16_t",
  u32: "uint32_t",
  u64: "uint64_t",
  f64: "double",
  bool: "bool",
  string: "std::string",
  char: "char",
};

export const cppContainerMap: Record<
  CONTAINER_TYPE,
  (inner: string) => string
> = {
  // unary
  nullable: (x) => `${x}*`,
  array: (x) => `std::vector<${x}>`,
  set: (x) => `std::set<${x}>`,
  optional: (x) => `std::optional<${x}>`,
  binary_tree: (x) => `TreeNode<${x}>`,
  linked_list: (x) => `ListNode<${x}>`,

  // variadic
  map: (x) => `std::map<${x}>`,
  tuple: (x) => `std::tuple<${x}>`,
  variant: (x) => `std::variant<${x}>`,
};
