import z from "zod";

export const MAX_PAGE_SIZE = 100 as const;
export const MIN_PAGE_SIZE = 1 as const;
export const DEFAULT_PAGE_SIZE = 20 as const;

export const zPageLimit = z
  .number()
  .min(MIN_PAGE_SIZE)
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE);

export const zPageOffset = z.number().min(1).default(1);

export const calcOffset = ({ limit, page }: { limit: number; page: number }) =>
  (page - 1) * limit;
