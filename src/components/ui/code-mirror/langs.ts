import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { FileExtension } from "./editor-filesys";

export const getAllLangExtensions = () => ({
  cpp: cpp(),
  python: python(),
  javascript: javascript(),
  markdown: markdown(),
  json: json(),
});

export const fileExtToLangExt = (
  input: string,
  langExtensions?: ReturnType<typeof getAllLangExtensions>,
) => {
  if (!langExtensions) langExtensions = getAllLangExtensions();

  // as for switch case autocomplete
  switch (input as FileExtension) {
    case "cpp":
    case "hpp":
      return langExtensions.cpp;
    case "py":
      return langExtensions.python;
    case "json":
      return langExtensions.json;
    case "js":
      return langExtensions.javascript;
    case "md":
      return langExtensions.markdown;
  }
};
