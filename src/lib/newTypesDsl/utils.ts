export const prefixLines = <T extends string | undefined>(
  input: T,
  prefix: string,
) => input?.replace(/^/gm, prefix) as T extends string ? string : undefined;

export const applySlashComment = <T extends string | undefined>(input: T) =>
  prefixLines(input, "// ");
export const applyHashComment = <T extends string | undefined>(input: T) =>
  prefixLines(input, "# ");
