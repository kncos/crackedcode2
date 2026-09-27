import * as Popover from '@radix-ui/react-popover';
import { PropsWithChildren, ReactNode } from 'react';

type CardPopoverProps = PropsWithChildren<{
  trigger: ReactNode; // usually a <button>
  align?: Popover.PopoverContentProps['align'];
}>;

export const CardPopover = ({
  trigger,
  align = 'start',
  children,
}: CardPopoverProps) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align={align}>
          <div className="card bg-base-100 card-border">
            <div className="card card-body">{children}</div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
