import { useEffect, useRef } from 'react';

export function useDebouncedCallback<A extends unknown[]>(callback: (...args: A) => void, delayMs: number) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (...args: A) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
  };
}
