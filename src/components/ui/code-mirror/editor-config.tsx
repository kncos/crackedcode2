"use client";

import { vim } from "@replit/codemirror-vim";
import { EditorView } from "@uiw/react-codemirror";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";
import z from "zod";

export const zEditorConfig = z.object({
  keyBindings: z.enum(["default", "vim"]).optional().default("default"),
  fontSizePx: z.number().min(6).max(36).optional().default(16),
  lineWrap: z.boolean().optional().default(false),
});

const useEditorExtensions = (input: z.infer<typeof zEditorConfig>) => {
  const { fontSizePx, keyBindings, lineWrap } = input;

  const extTheme = useMemo(
    () =>
      EditorView.theme({
        "&": {
          fontSize: `${fontSizePx}px`,
        },
      }),
    [fontSizePx],
  );

  const extLineWrap = useMemo(
    () => (lineWrap ? EditorView.lineWrapping : undefined),
    [lineWrap],
  );

  const extVim = useMemo(
    () => (keyBindings === "vim" ? vim() : undefined),
    [keyBindings],
  );

  const extensions = useMemo(() => {
    const e = [];
    if (extTheme) e.push(extTheme);
    if (extLineWrap) e.push(extLineWrap);
    if (extVim) e.push(extVim);
    return e;
  }, [extTheme, extLineWrap, extVim]);

  return extensions;
};

export type EditorConfigCtxType = {
  config: z.infer<typeof zEditorConfig>;
  extensions: ReturnType<typeof useEditorExtensions>;
  setConfig: Dispatch<SetStateAction<z.input<typeof zEditorConfig>>>;
};

const EditorConfigCtx = createContext<EditorConfigCtxType | null>(null);

export type EditorConfigProviderProps = {
  initialConfig?: z.input<typeof zEditorConfig>;
} & PropsWithChildren;

export function EditorConfigProvider(props: EditorConfigProviderProps) {
  const { children, initialConfig = {} } = props;
  // initialize config
  const [rawConfig, setConfig] =
    useState<z.input<typeof zEditorConfig>>(initialConfig);

  // i parse here because this way, the error hits the nearest error boundary
  // instead of happening in the event handler
  const config = useMemo(() => zEditorConfig.parse(rawConfig), [rawConfig]);
  const extensions = useEditorExtensions(config);

  const value = useMemo(
    () => ({ config, setConfig, extensions }),
    [config, setConfig, extensions],
  );

  return (
    <EditorConfigCtx.Provider value={value}>
      {children}
    </EditorConfigCtx.Provider>
  );
}

export function useEditorConfig() {
  const ctx = useContext(EditorConfigCtx);
  if (ctx === null || ctx === undefined) {
    throw new Error(
      "useEditorConfig must be used within an EditorConfigProvider",
    );
  }
  return ctx;
}
