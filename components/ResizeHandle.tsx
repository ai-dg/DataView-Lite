'use client';

import type { PointerEvent } from 'react';

interface ResizeHandleProps {
  /** Side of the *panel being resized* relative to the handle. */
  side: 'left' | 'right';
  onPointerDown: (e: PointerEvent, side: 'left' | 'right') => void;
  ariaLabel?: string;
}

/**
 * Thin draggable separator. Hidden by default, shows a 1px slate line on
 * hover or while dragging. Pointer events handled in the parent hook.
 */
export function ResizeHandle({ side, onPointerDown, ariaLabel }: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel ?? 'Redimensionner le panneau'}
      onPointerDown={(e) => onPointerDown(e, side)}
      className="group relative w-1 shrink-0 cursor-col-resize select-none bg-transparent hover:bg-accent-100 active:bg-accent-100 transition-colors"
    >
      {/* Wider invisible hit area for easier grabbing. */}
      <span aria-hidden="true" className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
