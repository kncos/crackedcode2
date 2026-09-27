import { useCallback, useEffect, useRef, useState } from "react";

export interface UseControllableStateParams<T> {
  value?: T;
  defaultValue?: T | (() => T);
  onChange?: (value: T) => void;
}

export function useControllableState<T>({
  value: controlledValue,
  defaultValue,
  onChange,
}: UseControllableStateParams<T>): [T, (next: T | ((prev: T) => T)) => void] {
  const isControlled = controlledValue !== undefined;

  const [internalState, setInternalState] = useState<T>(defaultValue as T);

  const value = isControlled ? controlledValue : internalState;

  // ref to latest onChange so updater functions stay stable
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const nextValue =
        typeof next === "function" ? (next as (prev: T) => T)(value) : next;

      if (!isControlled) {
        setInternalState(nextValue);
      }

      onChangeRef.current?.(nextValue);
    },
    [isControlled, value],
  );

  return [value, setValue];
}
