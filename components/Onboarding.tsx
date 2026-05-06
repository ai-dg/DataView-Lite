'use client';

import { useEffect, useState } from 'react';

interface OnboardingProps {
  open: boolean;
  onClose: () => void;
}

interface Step {
  title: string;
  body: string;
  hint?: string;
}

const STEPS: Step[] = [
  {
    title: 'Bienvenue dans DataView Lite',
    body:
      'Un explorateur sécurisé de bases SQLite. Tout reste sur votre ordinateur, et la base est ouverte en lecture seule : aucun risque de modifier vos données.',
    hint: 'Cliquez sur « Suivant » pour découvrir les fonctionnalités.',
  },
  {
    title: '1. Importez une base',
    body:
      'Glissez un fichier .sqlite ou .db dans la zone d’accueil, ou utilisez le bouton « Importer une base » en haut à droite. Vos données ne quittent jamais votre machine.',
    hint: 'Astuce : trois bases de démonstration sont fournies dans le dossier demo-databases/.',
  },
  {
    title: '2. Parcourez vos tables',
    body:
      'La barre latérale gauche liste toutes les tables détectées avec un libellé lisible et le nombre de lignes. Cliquez sur une table pour afficher son contenu.',
    hint: 'Vous pouvez redimensionner la sidebar en glissant son bord droit.',
  },
  {
    title: '3. Cherchez et exportez',
    body:
      'Une barre de recherche permet de filtrer les lignes de la table active. Les boutons « Exporter en CSV » et « Exporter en PDF » téléchargent tout le résultat filtré, prêt à coller dans un courrier ou un tableur.',
  },
  {
    title: '4. Posez vos questions',
    body:
      "Le panneau Assistant à droite répond en français à vos questions sur les données importées (« Combien de clients à Lyon ? », « Qui n'a pas payé ? », « Résume cette table »). Aucune ligne de SQL ne vous sera jamais montrée.",
    hint: 'Le bouton « ? » en haut à droite rouvre ce guide à tout moment.',
  },
];

export function Onboarding({ open, onClose }: OnboardingProps) {
  const [step, setStep] = useState(0);

  // Reset to first step each time the guide opens.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && step < STEPS.length - 1) setStep((s) => s + 1);
      else if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step, onClose]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mode guidé"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <button
        aria-label="Fermer le guide"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] cursor-default"
      />

      {/* Card */}
      <div
        key={step}
        className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-soft p-6 animate-[fadeIn_180ms_ease-out]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400 font-semibold mb-1">
              Étape {step + 1} sur {STEPS.length}
            </p>
            <h2 className="text-lg font-semibold text-slate-900 leading-snug">
              {current.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-slate-400 hover:text-slate-700 text-sm leading-none"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-700 leading-relaxed">{current.body}</p>
        {current.hint && (
          <p className="mt-2 text-xs text-slate-500 leading-relaxed italic">
            {current.hint}
          </p>
        )}

        {/* Progress dots */}
        <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={[
                'h-1.5 rounded-full transition-all',
                i === step ? 'w-6 bg-slate-900' : 'w-1.5 bg-slate-200',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            Passer le guide
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-sm px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              {isLast ? 'Commencer' : 'Suivant'}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
