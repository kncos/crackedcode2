import { cn } from "@/lib/utils";

type CardProps = {
  className?: string;
} & React.PropsWithChildren;

export function Card(props: CardProps) {
  const { className, children } = props;

  return (
    <div
      className={cn(
        "card card-border w-full h-full bg-neutral shadow-md",
        className,
      )}
    >
      <div className="card-body">{children}</div>
    </div>
  );
}
