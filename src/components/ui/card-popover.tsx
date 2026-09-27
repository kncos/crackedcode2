import * as Popover from "@radix-ui/react-popover";
import { PropsWithChildren, ReactElement } from "react";

type CardPopoverProps = PropsWithChildren<{
  trigger: ReactElement; // usually a <button>
  align?: Popover.PopoverContentProps["align"];
}>;

// popover wrapper
export const CardPopover = ({
  trigger,
  align = "start",
  children,
}: CardPopoverProps) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align={align}>{children}</Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
