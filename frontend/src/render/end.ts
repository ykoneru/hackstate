import { useRef } from "react";

export function useEnd(onFinish: (outcome: "win" | "lose") => void) {
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const ended = useRef(false);
  return (outcome: "win" | "lose") => {
    if (ended.current) return;
    ended.current = true;
    finishRef.current(outcome);
  };
}
