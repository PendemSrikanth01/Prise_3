import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRISE 3.0 | Incubation Tracker",
  description: "A milestone-driven coordination workspace for the PRISE 3.0 cohort.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "PrISE 3.0" },
  icons: { icon: "/pwa-icon.svg", apple: "/pwa-icon.svg" },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#397c98' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-prise-page text-prise-text">{children}</body>
    </html>
  );
}
