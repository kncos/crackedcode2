"use client";

import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { vim } from "@replit/codemirror-vim";
import { EditorView } from "@uiw/react-codemirror";
import z from "zod";

export const EDITOR_LANGS = [
  "Markdown",
  "Python",
  "JavaScript",
  "C++",
  "Json",
] as const;

export type EditorLang = (typeof EDITOR_LANGS)[number];

export const zEditorConfig = z.object({
  language: z.string().optional().default("Python"),
  keyBindings: z.enum(["default", "vim"]).optional().default("default"),
  fontSizePx: z.number().min(6).max(36).optional().default(16),
  lineWrap: z.boolean().optional().default(false),
});

export const editorConfigToExtensions = (
  input?: z.input<typeof zEditorConfig>,
) => {
  // if no input provided, parsing an empty
  // object will just use default values
  const config = zEditorConfig.parse(input);

  // build up extensions array based on config
  const extensions = [];
  // we'll always have font size
  extensions.push(
    EditorView.theme({
      "&": {
        fontSize: `${config.fontSizePx}px`,
      },
    }),
  );

  // apply line wrapping if needed
  if (config.lineWrap) {
    extensions.push(EditorView.lineWrapping);
  }

  // apply vim keybindings if enabled
  if (config.keyBindings === "vim") {
    extensions.push(vim());
  }

  // finally, language
  switch (config.language as EditorLang) {
    case "Markdown":
      extensions.push(markdown());
      break;
    case "Python":
      extensions.push(python());
      break;
    case "JavaScript":
      extensions.push(javascript());
      break;
    case "C++":
      extensions.push(cpp());
      break;
    case "Json":
      extensions.push(json());
      break;
  }

  return extensions;
};
