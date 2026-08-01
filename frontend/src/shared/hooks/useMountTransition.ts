import { useEffect, useState } from "react";

export function useMountTransition(isMounted: boolean, delayTime: number) {
  const [shouldRender, setShouldRender] = useState(false);
  const [hasTransitionedIn, setHasTransitionedIn] = useState(false);

  useEffect(() => {
    let timeoutId: number;
    let frameId: number;

    if (isMounted) {
      setShouldRender(true);
      // Double rAF ensures the element is rendered to the DOM and painted
      // BEFORE triggering the transition class.
      frameId = requestAnimationFrame(() => {
        frameId = requestAnimationFrame(() => {
          setHasTransitionedIn(true);
        });
      });
    } else {
      setHasTransitionedIn(false);
      timeoutId = window.setTimeout(() => setShouldRender(false), delayTime);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
  }, [isMounted, delayTime]);

  return { shouldRender, hasTransitionedIn };
}
