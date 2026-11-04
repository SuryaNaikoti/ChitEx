import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0c0c0e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Nectar — Voice-First Social Discovery',
  description: 'Voice-first social discovery and entertainment platform for India featuring real-time audio connections, premium calling, coin wallet economy, and creator gifting.',
  openGraph: {
    title: 'Nectar — Voice-First Social Discovery',
    description: 'Voice-first social discovery and entertainment platform for India.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0c0c0e] text-zinc-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
