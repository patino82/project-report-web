import type { Metadata } from "next";
import Script from "next/script";
import { ThemeHeader } from "@/components/theme-brand";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Lookahead | TMA",
  description: "Kinetic Field Command via Telegram Mini App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased overflow-x-hidden">
        <ThemeProvider>
          <ThemeHeader />
          <main className="min-h-screen w-full">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
