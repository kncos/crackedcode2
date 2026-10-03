"use client";

import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
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

export const EDITOR_LANGS = [
  "Markdown",
  "Python",
  "JavaScript",
  "C++",
  "Json",
] as const;

export type EditorLang = (typeof EDITOR_LANGS)[number];

export const EDITOR_LANG_EXT_MAP = {
  Markdown: ["md"] as const,
  Python: ["py"] as const,
  JavaScript: ["js"] as const,
  "C++": ["cpp", "hpp"] as const,
  Json: ["json"] as const,
} as const satisfies Record<EditorLang, string[]>;
export type EditorLangExtMap = typeof EDITOR_LANG_EXT_MAP;

export const zEditorConfig = z.object({
  language: z.string().optional().default("Python"),
  keyBindings: z.enum(["default", "vim"]).optional().default("default"),
  fontSizePx: z.number().min(6).max(36).optional().default(16),
  lineWrap: z.boolean().optional().default(false),
});

const useEditorExtensions = (input: z.infer<typeof zEditorConfig>) => {
  const { fontSizePx, language, keyBindings, lineWrap } = input;

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

  const extLanguage = useMemo(() => {
    switch (language as EditorLang) {
      case "Python":
        return python();
      case "Markdown":
        return markdown();
      case "JavaScript":
        return javascript();
      case "C++":
        return cpp();
      case "Json":
        return json();
      default:
        return undefined;
    }
  }, [language]);

  const extVim = useMemo(
    () => (keyBindings === "vim" ? vim() : undefined),
    [keyBindings],
  );

  const extensions = useMemo(
    () => [extTheme, extLineWrap, extLanguage, extVim],
    [extTheme, extLineWrap, extLanguage, extVim],
  );

  return extensions;
};

type EditorConfigCtxType = {
  config: z.infer<typeof zEditorConfig>;
  extensions: ReturnType<typeof useEditorExtensions>;
  setConfig: Dispatch<SetStateAction<z.input<typeof zEditorConfig>>>;
};

const EditorConfigCtx = createContext<EditorConfigCtxType | null>(null);

type EditorConfigProviderProps = {
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
