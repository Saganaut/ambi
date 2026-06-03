// Shrinks an element's font-size until its content fits inside the element's
// own box (scrollHeight ≤ clientHeight). Steps down from `maxPx` to `minPx`;
// below `minPx` the content clips. Re-runs on `text` change and on the
// element resizing (ResizeObserver).
import { useLayoutEffect, useRef } from "react";

interface FitTextOptions {
  minPx?: number;
  maxPx?: number;
  stepPx?: number;
}

export function useFitText<T extends HTMLElement>(
  text: string,
  { minPx = 11, maxPx = 16, stepPx = 0.5 }: FitTextOptions = {},
) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let size = maxPx;
      el.style.fontSize = `${size.toString()}px`;
      while (el.scrollHeight > el.clientHeight && size > minPx) {
        size -= stepPx;
        el.style.fontSize = `${size.toString()}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [text, minPx, maxPx, stepPx]);

  return ref;
}
