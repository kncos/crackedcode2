import { client } from "@/lib/orpc";

export const mockProblem = {
  categories: ["arrays", "two-pointers", "sorting"],
  createdAt: new Date("1995-12-17T03:24:00"),
  updatedAt: new Date("1995-12-17T03:24:00"),
  difficulty: 800,
  description:
    "## Some header\n" +
    "Some content with a `code block`\n" +
    "Some more content with a bigger code block:\n" +
    "```python\n" +
    "def foo():\n" +
    "  pass\n" +
    "```\n" +
    "end of problem description! **bold** *italics*\n",
  editorial:
    +"# H1\n" +
    "## H2\n" +
    "### H3\n" +
    "#### H4\n" +
    "##### H5\n" +
    "###### H6\n" +
    "very nested",
  title: "some problem",
  id: "id-xyz",
  userFiles: [
    {
      name: "solution.cpp",
      contents: "int64_t someProblem(int64_t a, int64_t b) {\n\n}\n",
    },
    {
      name: "solution.py",
      contents: "def someProblem(a, b):\n  pass\n",
    },
  ],
} satisfies Awaited<ReturnType<typeof client.problems.findOne>>;
