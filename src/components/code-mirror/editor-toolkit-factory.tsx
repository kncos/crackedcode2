"use client";

import { createEditorComponent } from "./editor";
import { createTextEditorConfigContext } from "./editor-config-context-factory";
import { createEditorConfigForm } from "./editor-config-form-factory";
import { createTextEditorContext } from "./editor-context-factory";

export const createTextEditorToolkit = (editorName: string) => {
  const { EditorProvider, useEditor } = createTextEditorContext(editorName);

  const { EditorConfigProvider, useEditorConfig, useEditorConfigOptional } =
    createTextEditorConfigContext(editorName);

  const Editor = createEditorComponent({
    useEditorConfigOptional,
  });

  const EditorConfigForm = createEditorConfigForm({
    name: editorName,
    useEditorConfig,
  });

  return {
    EditorProvider,
    useEditor,
    EditorConfigProvider,
    useEditorConfig,
    useEditorConfigOptional,
    EditorConfigForm,
    Editor,
  };
};
