import { zJsonFile } from "@/lib/types";
import { EditorState, ViewUpdate } from "@uiw/react-codemirror";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import z from "zod";
import { useEditorConfig } from "./editor-config";
import { fileExtToLangExt } from "./langs";

export const FILE_EXTENSIONS = [
  "cpp",
  "hpp",
  "py",
  "json",
  "js",
  "md",
  "txt",
] as const;
export type FileExtension = (typeof FILE_EXTENSIONS)[number];
export const splitFileExt = (fileName: string): [string, string] => {
  const delimIdx = fileName.lastIndexOf(".");
  const name = fileName.slice(0, delimIdx);
  const extension = fileName.slice(delimIdx + 1);
  return [name, extension];
};

export type EditorFilesystemCtxType = {
  // state
  currentFile: string;
  getFileNames: () => string[];
  setCurrentFile: Dispatch<SetStateAction<string>>;

  getState: (name: string) => EditorState | null;
  setState: (name: string, state: EditorState) => void;
  // operations
  serializeFile: (name: string) => z.infer<typeof zJsonFile> | null;
  deserializeFile: (file: z.infer<typeof zJsonFile>) => void;
  resetFile: (name: string) => void;
  deleteFile: (name: string) => void;
  // hook to make this function
  editorOnUpdateHook: (viewUpdate: ViewUpdate) => void;
};

const EditorFilesystemCtx = createContext<EditorFilesystemCtxType | null>(null);

export type EditorFilesystemProviderProps = {
  defaultFiles?: z.infer<typeof zJsonFile>[];
} & PropsWithChildren;

export function EditorFilesystemProvider(props: EditorFilesystemProviderProps) {
  const { children, defaultFiles = [] } = props;

  const [currentFile, setCurrentFile] = useState<string>("untitled");
  const stateMapRef = useRef<Map<string, EditorState>>(new Map());
  const dirtyRef = useRef<Set<string>>(new Set());

  const { extensions } = useEditorConfig();

  const deserializeFile = useCallback(
    (file: z.infer<typeof zJsonFile>) => {
      const [_, ext] = splitFileExt(file.name);
      const langExt = fileExtToLangExt(ext);
      const state = EditorState.create({
        doc: file.contents,
        extensions: langExt ? [...extensions, langExt] : [...extensions],
      });
      stateMapRef.current.set(file.name, state);
    },
    [extensions],
  );

  const serializeFile = useCallback((name: string) => {
    const state = stateMapRef.current.get(name);
    if (!state) {
      return null;
    }
    return {
      name,
      contents: state.doc.toString(),
    };
  }, []);

  const resetFile = useCallback(
    (name: string) => {
      const defaultIdx = defaultFiles.findIndex((df) => df.name === name);
      if (defaultIdx !== -1) {
        deserializeFile(defaultFiles[defaultIdx]);
      } else {
        deserializeFile({ name, contents: "" });
      }
    },
    [defaultFiles],
  );

  const deleteFile = useCallback((name: string) => {
    stateMapRef.current.delete(name);
    dirtyRef.current.delete(name);
  }, []);

  const editorOnUpdateHook = useCallback((vu: ViewUpdate) => {
    stateMapRef.current.set(currentFile, vu.state);
  }, []);

  const getFileNames = useCallback(() => {
    return stateMapRef.current.keys().toArray();
  }, []);

  const getState = useCallback((name: string) => {
    return stateMapRef.current.get(name) ?? null;
  }, []);

  const setState = useCallback((name: string, state: EditorState) => {
    stateMapRef.current.set(name, state);
  }, []);

  // only once on creation, if defaultFiles is updated afterwards,
  // we don't want to reset files automatically
  useEffect(() => {
    defaultFiles.forEach(deserializeFile);
    if (defaultFiles.length !== 0) {
      setCurrentFile(defaultFiles[0].name);
    }
  }, []);

  const value = useMemo(
    () => ({
      serializeFile,
      deserializeFile,
      resetFile,
      deleteFile,
      editorOnUpdateHook,
      currentFile,
      setCurrentFile,
      getFileNames,
      getState,
      setState,
    }),
    [serializeFile, deserializeFile, resetFile, deleteFile],
  );

  return (
    <EditorFilesystemCtx.Provider value={value}>
      {children}
    </EditorFilesystemCtx.Provider>
  );
}

export function useEditorFilesystem() {
  const ctx = useContext(EditorFilesystemCtx);
  if (ctx === null || ctx === undefined) {
    throw new Error(
      "useEditorFilesystem must be used within an EditorFilesystemProvider",
    );
  }
  return ctx;
}
