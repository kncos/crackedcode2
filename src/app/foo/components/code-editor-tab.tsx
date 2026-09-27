"use client";

import { CardPopover } from "@/components/ui/card-popover";
import {
  Editor,
  EditorConfigForm,
  useEditor,
} from "@/components/ui/code-mirror";
import { EDITOR_LANGS } from "@/components/ui/code-mirror/editor-config";
import { Selector } from "@/components/ui/selector";
import { useRef } from "react";

export function CodeEditorTab() {
  const { config, setConfig } = useEditor();

  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="card card-border w-full h-full bg-neutral shadow-md">
      <div className="card-body">
        <div className={`card-actions shrink-0`}>
          <Selector
            onChange={(v) => setConfig({ ...config, language: v })}
            value={config.language}
            possValues={EDITOR_LANGS}
            classNames={{
              select: "select select-xs select-primary w-24",
            }}
          />
          <CardPopover
            trigger={
              <button
                ref={btnRef}
                className="btn btn-xs btn-primary btn-outline w-24"
              >
                Settings
              </button>
            }
          >
            <EditorConfigForm />
          </CardPopover>
        </div>
        <div className="h-full min-h-0 w-full flex-1 outline outline-primary">
          <Editor className="h-full w-full" />
        </div>
        <div className="card-actions shrink-0">status</div>
      </div>
    </div>
  );
}
