import { zJsonFile } from "@/lib/types";
import { EditorState } from "@uiw/react-codemirror";
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

type FileName = string | null;
export type EditorFilesystemCtxType = {
  // state
  currentFile: FileName;
  fileNames: string[];
  setCurrentFile: Dispatch<SetStateAction<FileName>>;

  writeState: (name: string, state: EditorState | null) => void;
  readState: (name: FileName) => EditorState | null;

  writeSerialized: (file: z.infer<typeof zJsonFile>) => void;
  readSerialized: (name: FileName) => z.infer<typeof zJsonFile> | null;

  resetFile: (name: string) => void;
};

const EditorFilesystemCtx = createContext<EditorFilesystemCtxType | null>(null);

export type EditorFilesystemProviderProps = {
  defaultFiles?: z.infer<typeof zJsonFile>[];
} & PropsWithChildren;

export function EditorFilesystemProvider(props: EditorFilesystemProviderProps) {
  const { children, defaultFiles = [] } = props;

  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const [fileNames, setFileNames] = useState<string[]>([]);
  const stateMapRef = useRef<Map<string, EditorState>>(new Map());

  const { extensions } = useEditorConfig();

  const writeState = useCallback((name: string, state: EditorState | null) => {
    if (state !== null) {
      stateMapRef.current.set(name, state);
      setFileNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
    } else {
      stateMapRef.current.delete(name);
      setFileNames((prev) => prev.filter((n) => n !== name));
    }
  }, []);

  const readState = useCallback(
    (name: string | null) =>
      (name ? stateMapRef.current.get(name) : null) ?? null,
    [],
  );

  const writeSerialized = useCallback(
    (file: z.infer<typeof zJsonFile>) => {
      const [_, ext] = splitFileExt(file.name);
      const langExt = fileExtToLangExt(ext);
      const state = EditorState.create({
        doc: file.contents,
        extensions: langExt ? [...extensions, langExt] : [...extensions],
      });
      writeState(file.name, state);
    },
    [extensions, writeState],
  );

  const readSerialized = useCallback((name: string | null) => {
    if (name == null) return null;

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
      const file =
        defaultIdx === -1 ? { name, contents: "" } : defaultFiles[defaultIdx];

      writeSerialized(file);
    },
    [defaultFiles, writeSerialized],
  );

  // only once on creation, if defaultFiles is updated afterwards,
  // we don't want to reset files automatically
  useEffect(() => {
    console.log(
      "Default files: ",
      defaultFiles.map((d) => d.name),
    );
    defaultFiles.map(writeSerialized);
  }, []);

  const value = useMemo(
    () => ({
      currentFile,
      setCurrentFile,
      fileNames,
      writeState,
      readState,
      writeSerialized,
      readSerialized,
      resetFile,
    }),
    [
      currentFile,
      setCurrentFile,
      fileNames,
      writeState,
      readState,
      writeSerialized,
      readSerialized,
      resetFile,
    ],
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
