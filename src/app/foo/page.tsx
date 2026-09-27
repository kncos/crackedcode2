import { CodeEditorConfigProvider, CodeEditorProvider } from "./code-editor";
import { CodeEditorTab } from "./tabs/code-editor-tab";

export default async function FooPage() {
  return (
    <div className="flex min-w-fit justify-center gap-4 p-4">
      <CodeEditorProvider>
        <CodeEditorConfigProvider>
          <CodeEditorTab />
        </CodeEditorConfigProvider>
      </CodeEditorProvider>
    </div>
  );
}
