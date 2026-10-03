"use client";

import { historyField } from "@codemirror/commands";
import CodeMirror, {
  Extension,
  ReactCodeMirrorProps,
  ViewUpdate,
} from "@uiw/react-codemirror";
import { useCallback, useMemo } from "react";
import {
  EditorConfigProvider,
  EditorConfigProviderProps,
  useEditorConfig,
} from "./editor-config";
import {
  EditorFilesystemProvider,
  EditorFilesystemProviderProps,
  splitFileExt,
  useEditorFilesystem,
} from "./editor-filesys";
import { fileExtToLangExt } from "./langs";

export function EditorProvider(
  props: EditorConfigProviderProps & EditorFilesystemProviderProps,
) {
  const { children } = props;
  return (
    <EditorConfigProvider {...props}>
      <EditorFilesystemProvider {...props}>{children}</EditorFilesystemProvider>
    </EditorConfigProvider>
  );
}

export const useEditor = () => {
  const { config, setConfig } = useEditorConfig();
  const {
    currentFile,
    fileNames,
    setCurrentFile,
    writeSerialized,
    readSerialized,
    resetFile,
    deleteFile,
  } = useEditorFilesystem();

  return {
    config,
    setConfig,
    currentFile,
    fileNames,
    setCurrentFile,
    writeSerialized,
    readSerialized,
    resetFile,
    deleteFile,
  };
};

export const Editor = (props: ReactCodeMirrorProps) => {
  const {
    extensions: propExtensions,
    height = "100%",
    onUpdate: propOnUpdate,
    ...rest
  } = props;

  const { currentFile, getSnapshot, saveSnapshot, getRevision } =
    useEditorFilesystem();
  const { extensions: baseExtensions } = useEditorConfig();

  // Changes when the user switches files, or when a file is replaced from
  // outside the editor (writeSerialized / resetFile).
  const revision = currentFile ? getRevision(currentFile) : 0;
  const editorKey = `${currentFile ?? "<none>"}#${revision}`;

  // Read once per mount. Later edits mutate the map but must not change this,
  // otherwise `value` would churn.
  const snapshot = useMemo(
    () => (currentFile ? getSnapshot(currentFile) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editorKey, getSnapshot],
  );
  const initialDoc = useMemo(() => snapshot?.doc.toString() ?? "", [snapshot]);

  const langExt = useMemo(
    () => (currentFile ? fileExtToLangExt(splitFileExt(currentFile)[1]) : null),
    [currentFile],
  );

  // Seeds the history field on creation. Reconfigures (e.g. config form
  // changes) keep the live field value, so this only matters at mount.
  const historyExt = useMemo(
    () =>
      snapshot?.history !== undefined
        ? historyField.init(() => snapshot.history)
        : null,
    [snapshot],
  );

  const extensions = useMemo(() => {
    const all: Extension[] = [...baseExtensions];
    if (langExt) all.push(langExt);
    if (historyExt) all.push(historyExt);
    if (propExtensions) all.push(...propExtensions);
    return all;
  }, [baseExtensions, langExt, historyExt, propExtensions]);

  // Save pointers on every real transaction (doc, selection, history).
  // No React state is touched.
  const onUpdate = useCallback(
    (vu: ViewUpdate) => {
      if (currentFile && vu.transactions.length > 0) {
        saveSnapshot(currentFile, {
          doc: vu.state.doc,
          selection: vu.state.selection,
          history: vu.state.field(historyField, false),
        });
      }
      propOnUpdate?.(vu);
    },
    [currentFile, saveSnapshot, propOnUpdate],
  );

  return (
    <CodeMirror
      key={editorKey}
      height={height}
      minWidth="480px"
      // the theme lives in `extensions`, so turn off the wrapper's default
      // "light" theme, which would otherwise win on precedence
      theme="none"
      value={initialDoc}
      selection={snapshot?.selection}
      editable={currentFile !== null}
      extensions={extensions}
      onUpdate={onUpdate}
      {...rest}
    />
  );
};
