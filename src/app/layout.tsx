import type { Metadata } from "next";
import Script from "next/script";
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
    <html lang="en">
      <head>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased bg-[#0b0e12] text-[#e6e9ec] overflow-x-hidden">
        <main className="min-h-screen max-w-md mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
