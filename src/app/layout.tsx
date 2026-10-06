import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "24hr Story Feature",
  description: "Ephemeral 24hr Instagram-style stories clone",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}

