'use client';

interface FooterProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  shownCount: number;
  totalCount: number;
}

export function Footer({
  page,
  totalPages,
  onPrev,
  onNext,
  shownCount,
  totalCount,
}: FooterProps) {
  return (
    <footer className="h-10 shrink-0 border-t border-slate-200 bg-white px-6 flex items-center justify-between text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          aria-label="Page précédente"
          className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronIcon dir="left" />
        </button>
        <span className="tabular-nums">
          Page {page} sur {Math.max(totalPages, 1)}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Page suivante"
          className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronIcon dir="right" />
        </button>
        <span className="ml-3 text-slate-400 tabular-nums">
          {shownCount.toLocaleString('fr-FR')} sur {totalCount.toLocaleString('fr-FR')} lignes
        </span>
      </div>
      <div className="text-slate-400">DataView Lite</div>
    </footer>
  );
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: dir === 'left' ? 'rotate(180deg)' : undefined }}
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
