import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CANNABIS-CORE 360",
  description: "Next-Gen Command Center HUD",
};

import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { RoomProvider } from "../context/RoomContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch (_) {}
        `}} />
      </head>
      <body className="min-h-screen flex font-sans hud-grid-bg bg-background text-foreground transition-colors duration-300">
        <RoomProvider>
          <div className="h-screen sticky top-0 flex-shrink-0 relative z-20">
             <Sidebar />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <Topbar />
            <main className="flex-1 w-full p-4 md:p-6 pb-20">
               {children}
            </main>
          </div>
        </RoomProvider>
      </body>
    </html>
  );
}
