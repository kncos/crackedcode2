"use client";

import { Editor, useEditor } from "@/components/ui/code-mirror";
import { EDITOR_LANGS } from "@/components/ui/code-mirror/editor-config";
import { Selector } from "@/components/ui/selector";

export function CodeEditorTab() {
  const { config, setConfig } = useEditor();

  // i added this border because visually it adds some more space after the select caret
  // and seems to perform the illusion pretty well? works on my machine lol
  const selectStyle =
    "badge badge-sm bg-neutral border-neutral border-r-8 font-medium tracking-wide hover:outline hover:outline hover:outline-white/40 focus:outline focus:outline-white/40";

  return (
    <div className="bg-base-200 rounded-box flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div
        className={`border-base-300 flex h-8 shrink-0 flex-row items-center gap-2 border-b px-2`}
      >
        <Selector
          onChange={(v) => setConfig({ ...config, language: v })}
          value={config.language}
          possValues={EDITOR_LANGS}
          classNames={{
            select: selectStyle,
          }}
        />
      </div>
      <div className="h-full min-h-0 w-full flex-1 px-2">
        <Editor className="h-full w-full" />
      </div>
      <div className="border-base-300 flex h-6 shrink-0 flex-row gap-2 border-t px-2">
        status
      </div>
    </div>
  );
}
