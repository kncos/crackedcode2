import { EditorProvider } from "@/components/ui/code-mirror";
import { router } from "@/server/root";
import { call } from "@orpc/server";
import { ProblemMain } from "./components/main";
import { mockProblem } from "./components/mock";

const submitAction = async (code: string) => {
  "use server";

  const result = await call(router.submissions.create, {
    files: [
      {
        name: "solution.cpp",
        contents: code,
      },
    ],
    language: "cpp",
    problemId: "NULL",
  });

  console.log(JSON.stringify(result, null, 2));
  return result;
};

export default async function FooPage() {
  return (
    <EditorProvider defaultFiles={[...mockProblem.userFiles]}>
      <ProblemMain submitAction={submitAction} />
    </EditorProvider>
  );
}
