import z from "zod";
import { SUPPORTED_LANGS, SupportedLang } from "../types";

import { zJob } from "cracked-judge";
import { CrackedError } from "cracked-lib";
import { randomUUID } from "crypto";

const reserved_names = ["run.sh", "compile.sh"] as const;

const langFileExtensionMap: Record<SupportedLang, string[]> = {
  cpp: [".cpp", ".hpp"],
  python: [".py"],
} as const;

export const zUserSubmission = z
  .object({
    problemId: z.string(),
    language: z.enum(SUPPORTED_LANGS),
    files: zJob.shape.files.superRefine((files, ctx) => {
      const names = files.map((f) => f.name);
      const seen = new Set<string>();
      for (const n of names) {
        if (seen.has(n)) {
          ctx.addIssue(`duplicate file name '${n}' is not allowed.`);
        }

        seen.add(n);
        if (reserved_names.some((rn) => rn === n)) {
          ctx.addIssue(`Invalid file name: '${n}'. This is a reserved name.`);
        }
      }
    }),
  })
  .superRefine((submission, ctx) => {
    const lang = submission.language;
    const permittedExtensions = langFileExtensionMap[lang];

    let pyMainSeen = false;

    for (const file of submission.files) {
      if (!permittedExtensions.some((ext) => file.name.endsWith(ext))) {
        ctx.addIssue(
          `Invalid file name '${file.name}'. ` +
            `Files for language '${lang}' ` +
            `must end with one of the following extensions: ${permittedExtensions}.`,
        );
      }

      if (file.name === "main.py") {
        pyMainSeen = true;
      }
    }

    if (lang === "python" && !pyMainSeen) {
      ctx.addIssue(
        `Invalid file structure for language '${lang}'. ` +
          `Python jobs require a 'main.py' job`,
      );
    }
  });

const createCppJob = (
  input: z.input<typeof zUserSubmission>,
): z.infer<typeof zJob> => {
  return zJob.parse({
    id: randomUUID(),
    commands: [
      { cmd: ["./compile.sh"], time: 20 },
      { cmd: ["./run.sh"], time: 10 },
    ],
    files: [
      ...input.files,
      {
        name: "run.sh",
        contents: "./main",
      },
      {
        name: "compile.sh",
        contents: "judge-c++ *.o *.cpp -o main",
      },
    ],
    saveAsHash: false,
  } satisfies z.infer<typeof zJob>);
};

const createPyJob = (
  input: z.infer<typeof zUserSubmission>,
): z.infer<typeof zJob> => {
  return zJob.parse({
    id: randomUUID(),
    commands: [
      {
        cmd: ["./run.sh"],
      },
    ],
    files: [
      ...input.files,
      {
        name: "run.sh",
        contents: "judge-py main.py",
      },
    ],
    saveAsHash: false,
  });
};

export const createJob = (
  input: z.infer<typeof zUserSubmission>,
): z.infer<typeof zJob> => {
  switch (input.language) {
    case "cpp":
      return createCppJob(input);
    case "python":
      return createPyJob(input);
  }

  throw new CrackedError("OTHER", {
    message: "Unimplemented or invalid language in createJob",
  });
};
