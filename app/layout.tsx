import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red Zone | NFL Matchups",
  description: "A personal NFL matchup dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
