import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zhe (Joe) Deng',
  description: 'Official academic website for Zhe (Joe) Deng.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
