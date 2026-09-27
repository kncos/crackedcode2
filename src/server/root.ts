import { problemsRouter } from "./problems";
import { submissionsRouter } from "./submissions";

export const router = {
  submissions: submissionsRouter,
  problems: problemsRouter,
};
