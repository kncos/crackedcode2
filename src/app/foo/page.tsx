import { Editor, EditorProvider } from "@/components/ui/code-mirror";

export default async function FooPage() {
  return (
    <div className="flex min-w-fit min-h-1/2 h-[50vh] justify-center gap-4 p-4">
      <EditorProvider>
        <Editor />
      </EditorProvider>
    </div>
  );
}
