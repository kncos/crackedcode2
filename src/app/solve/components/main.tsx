"use client";

import { useEditor } from "@/components/ui/code-mirror";
import { NavBar } from "@/components/ui/site-navbar";
import { useCallback } from "react";
import { CodeEditorTab } from "./code-editor-tab";
import { mockProblem } from "./mock";
import { ProblemTab } from "./problem-tab";

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
      <NavBar>
        <NavBar.Middle>
          <button className="btn btn-sm btn-primary">Run</button>
          <button onClick={doSubmit} className="btn btn-sm btn-accent">
            Submit
          </button>
        </NavBar.Middle>
        <NavBar.Right>
          <button className="btn btn-sm">?</button>
        </NavBar.Right>
      </NavBar>
      <div className="p-4 gap-4 h-full grid grid-cols-2">
        <ProblemTab problemData={mockProblem} />
        <CodeEditorTab />
      </div>
    </div>
  );
};
