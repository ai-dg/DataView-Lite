'use client';

interface ToastProps {
  message: string;
  tone?: 'success' | 'info';
  onClose: () => void;
}

export function Toast({ message, tone = 'success', onClose }: ToastProps) {
  const palette =
    tone === 'success'
      ? 'bg-slate-900 text-white border-slate-900'
      : 'bg-white text-slate-800 border-slate-200';

  return (
    <div
      role="status"
      className={[
        'fixed bottom-14 left-1/2 -translate-x-1/2 z-50',
        'px-4 py-2 rounded-md border shadow-soft text-sm',
        'flex items-center gap-3 max-w-md',
        palette,
      ].join(' ')}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="text-xs opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
