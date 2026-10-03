import { CopyIcon } from "@/components/ui/icons";
import "katex/dist/katex.min.css"; // Import KaTeX CSS for rendering math
import ReactMarkdown from "react-markdown";
// @ts-expect-error react-syntax-highlighter doesn't have types
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// @ts-expect-error react-syntax-highlighter doesn't have types
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// we'll import the vscode dark theme, but override the background color to
// contrast a bit better with the background colors in the app
const background = "#131313";
const vscDarkPlusOverride = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background,
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background,
  },
};

interface MarkdownRendererProps {
  children: string;
  maxLineWidthChars?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CodeComponent(props: any) {
  const { children, className, ...rest } = props;
  // Check if the code block contains newlines to determine if it's a code block.
  // from my testing, this is a reliable way to determine if we have a code block
  // defined by the triple backticks even in weird cases like triple backticks
  // on the same line as the code.
  const isCodeBlock = String(children).includes("\n");

  // this extracts the language name from className which is populated by ReactMarkdown
  // when the code block is defined by triple backticks with a language name
  const match = /language-(\w+)/.exec(className || "");

  if (match) {
    // if we have a match, then it's also a code block because the language was specified.
    // you can't specify a language without using triple backticks
    const codeContent = String(children).replace(/\n$/, "");
    return (
      <div className="group relative">
        <SyntaxHighlighter
          {...rest}
          PreTag="div"
          language={match[1]}
          style={vscDarkPlusOverride}
          className="card"
        >
          {codeContent}
        </SyntaxHighlighter>
        <button
          onClick={() => navigator.clipboard.writeText(codeContent)}
          className="btn btn-ghost btn-sm absolute top-2 right-2 opacity-30 transition-opacity hover:opacity-100"
          title="Copy code"
        >
          <CopyIcon className="h-4 w-4" />
        </button>
      </div>
    );
  } else if (isCodeBlock) {
    const codeContent = String(children).replace(/\n$/, "");

    return (
      <div className="group relative">
        <pre className="card overflow-x-auto bg-[#131313] p-4 text-sm">
          <code {...rest} className={className}>
            {children}
          </code>
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(codeContent)}
          className="btn btn-ghost btn-sm absolute top-2 right-2 opacity-30 transition-opacity hover:opacity-100"
          title="Copy code"
        >
          <CopyIcon className="h-4 w-4" />
        </button>
      </div>
    );
  } else {
    // inline code blocks with single backticks will fail both cases; in that
    // case we just want to ensure the bg color is applied
    return (
      <code
        {...rest}
        className={`${className || ""} rounded-sm bg-[#131313] p-1`}
      >
        {children}
      </code>
    );
  }
}

export default function MarkdownRenderer(props: MarkdownRendererProps) {
  const { children, maxLineWidthChars = 120 } = props;

  return (
    <div style={{ maxWidth: `${maxLineWidthChars}ch` }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex]}
        components={{
          code: CodeComponent,
          h1: (props) => (
            <h1
              className="text-primary my-3 text-3xl font-semibold"
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              className="text-accent my-2.5 text-2xl font-semibold"
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className="text-secondary my-2 text-xl font-semibold"
              {...props}
            />
          ),
          h4: (props) => (
            <h4
              className="my-1.5 text-lg font-semibold text-amber-400"
              {...props}
            />
          ),
          h5: (props) => (
            <h5 className="my-1 font-semibold text-red-400" {...props} />
          ),
          h6: (props) => (
            <h6
              className="font-underline my-0.5 font-semibold text-fuchsia-300"
              {...props}
            />
          ),
          // style lists
          ul: (props) => <ul className="my-0.5 list-disc pl-6" {...props} />,
          ol: (props) => <ol className="my-0.5 list-decimal pl-6" {...props} />,
          li: (props) => <li className="my-0.5 leading-relaxed" {...props} />,
          // style links
          a: (props) => (
            <a
              className="text-primary hover:underline"
              {...props}
              target="_blank"
              rel="noopener noreferrer"
            >
              {props.children}
            </a>
          ),
          // block quotes
          blockquote: (props) => (
            <blockquote
              className="border-primary my-2 border-l-2 bg-[#131313] px-4 py-2"
              {...props}
            />
          ),
          p: (props) => <p className="my-1 leading-relaxed" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
