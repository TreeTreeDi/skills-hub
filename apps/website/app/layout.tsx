import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skills Hub — AI Agent Skills",
  description: "Discover and install skills for AI coding agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
