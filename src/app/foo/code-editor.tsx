"use client";

import { createTextEditorToolkit } from "@/components/code-mirror";

export const {
  // editor component
  Editor: CodeEditor,
  // editor context stuff
  useEditor: useCodeEditor,
  EditorProvider: CodeEditorProvider,
  // editor config context stuff
  useEditorConfig: useCodeEditorConfig,
  useEditorConfigOptional: useCodeEditorConfigOptional,
  EditorConfigForm: CodeEditorConfigForm,
  EditorConfigProvider: CodeEditorConfigProvider,
} = createTextEditorToolkit("Code");
