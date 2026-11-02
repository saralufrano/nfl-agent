import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NFL Game Tracker",
  description: "A personal NFL scoring, spread, and picks tracker",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
