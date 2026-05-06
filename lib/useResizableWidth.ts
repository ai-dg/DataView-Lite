'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ResizeSide = 'left' | 'right';

interface Options {
  /** localStorage key for persistence; omit to skip persistence. */
  storageKey?: string;
  min: number;
  max: number;
  initial: number;
}

/**
 * Returns a width in pixels and a `startResize` handler to wire to a drag
 * handle. The width is clamped to [min, max] and persisted in localStorage
 * when `storageKey` is provided.
 */
export function useResizableWidth({ storageKey, min, max, initial }: Options) {
  const [width, setWidth] = useState<number>(initial);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed)) {
        setWidth(clamp(parsed, min, max));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist on change.
  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, String(Math.round(width)));
    } catch {
      // ignore
    }
  }, [width, storageKey]);

  const startRef = useRef<{ x: number; w: number; side: ResizeSide } | null>(null);

  const onMove = useCallback(
    (e: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const delta = e.clientX - start.x;
      const next = start.side === 'left' ? start.w + delta : start.w - delta;
      setWidth(clamp(next, min, max));
    },
    [min, max],
  );

  const onUp = useCallback(() => {
    startRef.current = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, [onMove]);

  const startResize = useCallback(
    (e: React.PointerEvent, side: ResizeSide) => {
      e.preventDefault();
      startRef.current = { x: e.clientX, w: width, side };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [width, onMove, onUp],
  );

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onMove, onUp]);

  return { width, startResize, setWidth };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
