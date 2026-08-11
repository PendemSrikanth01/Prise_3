import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRISE 3.0 | Incubation Tracker",
  description: "A milestone-driven coordination workspace for the PRISE 3.0 cohort.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-prise-page text-prise-text">{children}</body>
    </html>
  );
}
