import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DataView Lite',
  description:
    'Explorez votre base SQLite simplement, sans connaissance technique.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased text-slate-900">{children}</body>
    </html>
  );
}
