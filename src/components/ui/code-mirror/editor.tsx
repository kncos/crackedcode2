"use client";

import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror, {
  ReactCodeMirrorProps,
  ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  EditorConfigProvider,
  EditorConfigProviderProps,
  useEditorConfig,
} from "./editor-config";
import {
  EditorFilesystemProvider,
  EditorFilesystemProviderProps,
  useEditorFilesystem,
} from "./editor-filesys";

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

// note: there are some issues here where we can basically call some function
// on the filesystem API and then it has a race condition with state updates
// from the editor itself. That's because state only gets set from the
// map when the useEffect runs due to the files changing, so if something
// else changes the state, it is immediately overwritten and lost by the editor
export const useEditor = () => {
  const { config, setConfig } = useEditorConfig();
  const {
    currentFile,
    fileNames,
    setCurrentFile,
    writeSerialized,
    readSerialized,
  } = useEditorFilesystem();

  return {
    config,
    setConfig,
    currentFile,
    fileNames,
    setCurrentFile,
    writeSerialized,
    readSerialized,
  };
};

export const Editor = (props: ReactCodeMirrorProps) => {
  const { extensions: propExtensions, ...rest } = props;

  const { currentFile, readState, writeState } = useEditorFilesystem();
  const { extensions: baseExtensions } = useEditorConfig();
  const extensions = useMemo(() => {
    return [...baseExtensions, ...(propExtensions || [])];
  }, [baseExtensions, propExtensions]);

  const ref = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    const state = readState(currentFile);
    console.log("useEffect ran in editor");
    if (state) {
      console.log("state was present");
      ref.current?.view?.setState(state);
    }
  }, [currentFile]);

  const updateHook = useCallback(() => {
    if (currentFile && ref.current?.view?.state) {
      writeState(currentFile, ref.current.view.state);
    }
  }, [currentFile, writeState]);

  // the ref gets a reference to the internal editor state/view/etc.
  return (
    <CodeMirror
      ref={ref}
      height={props.height || "100%"}
      minWidth="480px"
      theme={vscodeDark}
      onChange={updateHook}
      initialState={}
      {...rest}
    />
  );
};
