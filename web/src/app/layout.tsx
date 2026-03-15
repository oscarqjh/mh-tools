import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/lib/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "GnawniaVerse — MouseHunt Community Tools",
  description: "Treasure chest value analyser and tools for MouseHunt players",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
