"use client";

import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror, {
  ReactCodeMirrorProps,
  ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import { Prettify } from "cracked-lib";
import {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
} from "react";
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

const EditorCtx = createContext(null);

export type EditorProvierProps = Prettify<
  EditorConfigProviderProps & EditorFilesystemProviderProps & PropsWithChildren
>;
export const EditorProvider = (props: EditorProvierProps) => {
  const { children } = props;
  return (
    <EditorConfigProvider {...props}>
      <EditorFilesystemProvider {...props}>{children}</EditorFilesystemProvider>
    </EditorConfigProvider>
  );
};

// note: there are some issues here where we can basically call some function
// on the filesystem API and then it has a race condition with state updates
// from the editor itself. That's because state only gets set from the
// map when the useEffect runs due to the files changing, so if something
// else changes the state, it is immediately overwritten and lost by the editor
export const useEditor = () => {
  const { config, setConfig } = useEditorConfig();
  const { currentFile, getFileNames, setCurrentFile, serializeFile } =
    useEditorFilesystem();
};

export const Editor = (props: ReactCodeMirrorProps) => {
  const { extensions: propExtensions, ...rest } = props;

  const { currentFile, getState, setState, editorOnUpdateHook } =
    useEditorFilesystem();
  const { extensions: baseExtensions } = useEditorConfig();
  const extensions = useMemo(() => {
    return [...baseExtensions, ...(propExtensions || [])];
  }, [baseExtensions, propExtensions]);

  const innerRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    const state = getState(currentFile);
    if (state) {
      innerRef.current?.view?.setState(state);
    } else if (innerRef.current?.state) {
      setState(currentFile, innerRef.current.state);
    } else {
      throw new Error("Something went wrong with code editor filesystem state");
    }
  }, [currentFile]);

  // the ref gets a reference to the internal editor state/view/etc.
  return (
    <CodeMirror
      ref={innerRef}
      height={props.height || "100%"}
      minWidth="480px"
      theme={props.theme || vscodeDark}
      extensions={extensions}
      onUpdate={editorOnUpdateHook}
      {...rest}
    />
  );
};
