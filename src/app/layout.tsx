import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppToaster } from "@/components/app-toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "RH Ponto",
  description: "Ponto eletrônico com reconhecimento facial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn("h-full antialiased", inter.variable)}>
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
