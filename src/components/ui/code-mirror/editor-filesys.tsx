import { zJsonFile } from "@/lib/types";
import { EditorState } from "@uiw/react-codemirror";
import { createContext, PropsWithChildren } from "react";
import z from "zod";
import { useEditorConfig } from "./editor-config";

type EditorFilesystemCtxType = {
  fileMap: Map<string, EditorState>;
  initialFiles: z.infer<typeof zJsonFile>[];
};

const EditorFilesystemCtx = createContext(undefined);

type EditorFilesystemProviderProps = {} & PropsWithChildren;

export function EditorFilesystemProvider(props: EditorFilesystemProviderProps) {
  const { children } = props;

  const { config, setConfig, extensions } = useEditorConfig();

  return (
    <EditorFilesystemCtx.Provider value={undefined}>
      {children}
    </EditorFilesystemCtx.Provider>
  );
}

export function useEditorFilesystem() {}
