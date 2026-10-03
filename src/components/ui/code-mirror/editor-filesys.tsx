import { zJsonFile } from "@/lib/types";
import { EditorSelection, Text } from "@uiw/react-codemirror";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
} from "react";
import z from "zod";

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

/**
 * Everything we keep per file. All of these are immutable values, so storing
 * them is just holding pointers. No extensions, no React state.
 */
export type FileSnapshot = {
  doc: Text;
  selection?: EditorSelection;
  // opaque value of CodeMirror's historyField (typed `unknown` upstream)
  history?: unknown;
};
type FileEntry = FileSnapshot & { revision: number };

type FileName = string | null;
type JsonFile = z.infer<typeof zJsonFile>;

export type EditorFilesystemCtxType = {
  currentFile: FileName;
  fileNames: string[];
  setCurrentFile: Dispatch<SetStateAction<FileName>>;

  // used by the editor. Saving never triggers a React re-render.
  getSnapshot: (name: string) => FileSnapshot | null;
  saveSnapshot: (name: string, snapshot: FileSnapshot) => void;
  // bumps whenever a file is replaced from outside the editor
  getRevision: (name: string) => number;

  // external API. Replaces contents and clears history.
  writeSerialized: (file: JsonFile) => void;
  readSerialized: (name: FileName) => JsonFile | null;
  resetFile: (name: string) => void;
  deleteFile: (name: string) => void;
};

const EditorFilesystemCtx = createContext<EditorFilesystemCtxType | null>(null);

export type EditorFilesystemProviderProps = {
  defaultFiles?: JsonFile[];
} & PropsWithChildren;

const toDoc = (contents: string) => Text.of(contents.split(/\r?\n/));

export function EditorFilesystemProvider(props: EditorFilesystemProviderProps) {
  const { children, defaultFiles = [] } = props;

  const [currentFile, setCurrentFile] = useState<FileName>(null);
  const [fileNames, setFileNames] = useState<string[]>(() =>
    defaultFiles.map((f) => f.name),
  );

  // Stable, mutable map created once. Seeded synchronously, so there is no
  // "effect runs after first render" gap. Defaults are only applied once;
  // later changes to defaultFiles don't reset anything.
  const [files] = useState(() => {
    const map = new Map<string, FileEntry>();
    for (const f of defaultFiles) {
      map.set(f.name, { doc: toDoc(f.contents), revision: 0 });
    }
    return map;
  });

  // Only used to make context consumers re-render after an external write.
  const [version, bump] = useReducer((n: number) => n + 1, 0);

  const getSnapshot = useCallback(
    (name: string) => files.get(name) ?? null,
    [files],
  );

  const getRevision = useCallback(
    (name: string) => files.get(name)?.revision ?? 0,
    [files],
  );

  const saveSnapshot = useCallback(
    (name: string, snapshot: FileSnapshot) => {
      const prev = files.get(name);
      if (!prev) return; // file was deleted while the editor was mounted
      files.set(name, { ...snapshot, revision: prev.revision });
    },
    [files],
  );

  const writeSerialized = useCallback(
    (file: JsonFile) => {
      const prev = files.get(file.name);
      files.set(file.name, {
        doc: toDoc(file.contents),
        revision: (prev?.revision ?? 0) + 1,
      });
      setFileNames((names) =>
        names.includes(file.name) ? names : [...names, file.name],
      );
      bump();
    },
    [files],
  );

  const readSerialized = useCallback(
    (name: FileName) => {
      if (name == null) return null;
      const entry = files.get(name);
      if (!entry) return null;
      return { name, contents: entry.doc.toString() };
    },
    [files],
  );

  const resetFile = useCallback(
    (name: string) => {
      const def = defaultFiles.find((df) => df.name === name);
      writeSerialized(def ?? { name, contents: "" });
    },
    [defaultFiles, writeSerialized],
  );

  const deleteFile = useCallback(
    (name: string) => {
      files.delete(name);
      setFileNames((names) => names.filter((n) => n !== name));
      setCurrentFile((cur) => (cur === name ? null : cur));
    },
    [files],
  );

  const value = useMemo(
    () => ({
      currentFile,
      setCurrentFile,
      fileNames,
      getSnapshot,
      saveSnapshot,
      getRevision,
      writeSerialized,
      readSerialized,
      resetFile,
      deleteFile,
    }),
    // `version` forces a new context value after external writes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      currentFile,
      fileNames,
      version,
      getSnapshot,
      saveSnapshot,
      getRevision,
      writeSerialized,
      readSerialized,
      resetFile,
      deleteFile,
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
