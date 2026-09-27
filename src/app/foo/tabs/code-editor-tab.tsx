"use client";

import {
  EditorConfigSchema,
  EditorConfigSchemaType,
} from "@/components/code-mirror/editor-config";
import { Selector } from "@/components/selector";
import { CodeEditor, useCodeEditor, useCodeEditorConfig } from "../code-editor";

export function CodeEditorTab() {
  const { config, setLanguage } = useCodeEditorConfig();

  const ctx = useCodeEditor();

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
          onChange={(v) => setLanguage(v as EditorConfigSchemaType["language"])}
          value={config.language}
          possValues={
            EditorConfigSchema.shape.language.unwrap().unwrap().options
          }
          classNames={{
            select: selectStyle,
          }}
        />
      </div>
      <div className="h-full min-h-0 w-full flex-1 px-2">
        <CodeEditor className="h-full w-full" {...ctx} />
      </div>
      <div className="border-base-300 flex h-6 shrink-0 flex-row gap-2 border-t px-2">
        status
      </div>
    </div>
  );
}
