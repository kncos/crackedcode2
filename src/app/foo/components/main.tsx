"use client";

import { useEditor } from "@/components/ui/code-mirror";
import { useCallback } from "react";
import { CodeEditorTab } from "./code-editor-tab";

export const ProblemMain = (props: {
  submitAction: (input: string) => any;
}) => {
  const { submitAction } = props;
  const { getText } = useEditor();

  const doSubmit = useCallback(async () => {
    const text = getText();
    return await submitAction(text);
  }, [getText, submitAction]);

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="navbar bg-neutral shadow-sm px-4 grid grid-cols-3">
        <div className="justify-self-start flex flex-row gap-2">
          <span className="text-xl font-semibold text-primary">
            CrackedCode
          </span>
        </div>
        <div className="justify-self-center flex flex-row gap-2">
          <button className="btn btn-sm btn-primary">Run</button>
          <button onClick={doSubmit} className="btn btn-sm btn-accent">
            Submit
          </button>
        </div>
        <div className="justify-self-end flex flex-row gap-2">
          <button className="btn btn-sm">?</button>
        </div>
      </div>
      <div className="p-4 gap-4 h-full">
        <CodeEditorTab />
      </div>
    </div>
  );
};
