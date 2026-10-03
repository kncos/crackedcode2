import { EditorProvider, useEditor } from "@/components/ui/code-mirror";
import { client } from "@/lib/orpc";
import { createContext, PropsWithChildren } from "react";

const SolveCtx = createContext<any>(null);

export const useSolve = () => {
  const { getText, setText } = useEditor();
};

export type SolveProviderProps = {
  problemData: Awaited<ReturnType<typeof client.problems.findOne>>;
} & PropsWithChildren;

export function SolveProvider(props: SolveProviderProps) {
  const { problemData, children } = props;
  return (
    <EditorProvider>
      <SolveCtx.Provider value={null}>{children}</SolveCtx.Provider>
    </EditorProvider>
  );
}
