import { EditorProvider, useEditor } from "@/components/ui/code-mirror";
import { client } from "@/lib/orpc";
import { createContext, PropsWithChildren, useContext } from "react";

type ProblemType = Awaited<ReturnType<typeof client.problems.findOne>>;

const SolveCtx = createContext<ProblemType | null>(null);

export type SolveProviderProps = {
  problemData: ProblemType;
} & PropsWithChildren;

export function SolveProvider(props: SolveProviderProps) {
  const { problemData, children } = props;
  return (
    <EditorProvider>
      <SolveCtx.Provider value={problemData}>{children}</SolveCtx.Provider>
    </EditorProvider>
  );
}

function findFileWithExtension(files: ProblemType["userFiles"], lang: string) {
  if (!files) {
    return -1;
  }

  // @ts-expect-error lang type is wider than supported langs
  const fileExtensions: string[] | undefined = EDITOR_LANG_EXT_MAP[lang];
  if (!fileExtensions) {
    return -1;
  }

  const fileIdx = files.findIndex((f) =>
    fileExtensions.some((ext) => f.name === `solution.${ext}`),
  );
  return fileIdx;
}

export const useSolve = () => {
  const ctx = useContext(SolveCtx);
  if (ctx === null || ctx === undefined) {
    throw new Error("useSolve must be used within a SolveProvider");
  }

  const { getText, setText, config, setConfig, fileNames } = useEditor();

  const setLang = (lang: EditorLang) => {
    // no-op
    if (config.language === lang) {
      return;
    }

    const fileIdx = findFileWithExtension(ctx.userFiles, lang);
    if (fileIdx !== -1 && ctx.userFiles) {
      setText(ctx.userFiles[fileIdx].contents);
    }

    setConfig({
      ...config,
      language: lang,
    });
  };

  const submit = async () => {
    const result = await client.submissions.create({
      problemId: ctx.id,
      language:
        config.language === "Python"
          ? "python"
          : config.language === "C++"
            ? "cpp"
            : "cpp",
      files: ctx.userFiles ?? [],
    });
    console.debug(
      `[DEBUG] problem submission returned:\n${JSON.stringify(result, null, 2)}`,
    );
    return result;
  };

  const run = submit;
};
