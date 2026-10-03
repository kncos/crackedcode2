import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { client } from "@/lib/orpc";
import { Card } from "./card";

type ProblemTabProps = {
  className?: string;
  problemData: Awaited<ReturnType<typeof client.problems.findOne>>;
};

export function ProblemTab(props: ProblemTabProps) {
  const { className, problemData } = props;

  return (
    <Card className={className}>
      <span className="card-title">{problemData.title}</span>
      <span className="card-actions">
        {problemData.categories.map((category) => (
          <span key={category} className="badge badge-xs badge-base-100">
            {category}
          </span>
        ))}
      </span>
      <MarkdownRenderer>
        {problemData.description || "problem not found"}
      </MarkdownRenderer>
    </Card>
  );
}
