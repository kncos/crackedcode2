"use client";

import { SetStateType, zJsonFile } from "@/lib/types";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror, {
  EditorView,
  ReactCodeMirrorProps,
  ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import z from "zod";
import { editorConfigToExtensions, zEditorConfig } from "./editor-config";

export interface EditorContextValue {
  initialText?: string;
  getText: () => string;
  setText: (newText: string) => void;
  config: z.infer<typeof zEditorConfig>;
  setConfig: SetStateType<typeof zEditorConfig>;
  extensions: ReturnType<typeof editorConfigToExtensions>;
  _registerView: (view: EditorView | null) => void;
}

const editorCtx = createContext<EditorContextValue | null>(null);

type EditorProviderProps = {
  initialConfig?: z.input<typeof zEditorConfig>;
  initialFiles?: z.infer<typeof zJsonFile>[];
} & PropsWithChildren;

type EditorContext = {
  // editor's config
  config: z.infer<typeof zEditorConfig>;
  setConfig: SetStateType<z.infer<typeof zEditorConfig>>;
  // initial serialized files
  initialFiles?: z.infer<typeof zJsonFile>[];
  fileNames: Set<string>;
  // given a file name, returns the serialized file or null if non-existant
  getFile: (fileName: string) => z.infer<typeof zJsonFile> | null;
  setFile: (file: z.infer<typeof zJsonFile>) => void;
  deleteFile: (fileName: string) => void;
  resetFile: (fileName: string) => void;
};

export const EditorProvider = (props: EditorProviderProps) => {
  const pendingTextBuf = useRef<string | null>(null);

  // hoisted from a CodeMirror component somewhere in the tree
  const viewRef = useRef<EditorView | null>(null);
  const _registerView = useCallback((view: EditorView | null) => {
    viewRef.current = view;
    if (pendingTextBuf.current !== null && viewRef.current) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: view?.state.doc.length,
          insert: pendingTextBuf.current,
        },
      });

      pendingTextBuf.current = null;
    }
  }, []);

  const [config, _setConfig] = useState<z.infer<typeof zEditorConfig>>(() =>
    zEditorConfig.parse(initialConfig || {}),
  );

  const setConfig = useCallback(
    (
      input:
        | z.input<typeof zEditorConfig>
        | (() => z.input<typeof zEditorConfig>),
    ) => {
      const nonParsed = typeof input === "function" ? input() : input;
      const parsed = zEditorConfig.parse(nonParsed);
      _setConfig(parsed);
    },
    [_setConfig],
  );

  const extensions = useMemo(() => editorConfigToExtensions(config), [config]);

  const getText = useCallback(() => {
    if (viewRef.current) {
      return viewRef.current.state.doc.toString();
    }
    return "";
  }, []);

  const setText = useCallback((newText: string) => {
    const view = viewRef.current;
    if (!view) {
      pendingTextBuf.current = newText;
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: newText,
      },
    });
  }, []);

  const value = useMemo(
    () => ({
      getText,
      setText,
      _registerView,
      config,
      setConfig,
      extensions,
      initialText,
    }),
    [
      getText,
      setText,
      _registerView,
      config,
      setConfig,
      extensions,
      initialText,
    ],
  );

  return <editorCtx.Provider value={value}>{children}</editorCtx.Provider>;
};

export const useEditor = () => {
  const context = useContext(editorCtx);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
};

export const Editor = (props: ReactCodeMirrorProps) => {
  const { extensions: propExtensions, ...rest } = props;

  const context = useContext(editorCtx);
  // hoisted internal CodeMirror state to be referenced in this scope
  const innerRef = useRef<ReactCodeMirrorRef>(null);
  useEffect(() => {
    if (context && innerRef.current?.view) {
      // hoist the view into the context
      context._registerView(innerRef.current.view);
    }
    return () => {
      context?._registerView(null);
    };
  }, [context]);

  const defaultExtensions = useMemo(() => editorConfigToExtensions(), []);
  const extensions = context?.extensions || defaultExtensions;

  // the ref gets a reference to the internal editor state/view/etc.
  return (
    <CodeMirror
      ref={innerRef}
      defaultValue={context?.initialText}
      height={props.height || "100%"}
      minWidth="480px"
      theme={props.theme || vscodeDark}
      extensions={[...(propExtensions || []), ...extensions]}
      {...rest}
    />
  );
};
