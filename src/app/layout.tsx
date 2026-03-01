import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileHeader } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AIChatSidebar } from "@/components/ai-chat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Central 44 - Gestão de Serviços",
  description:
    "Sistema de gestão de ordens de serviço - Central Engenharia Elétrica",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Sidebar />
        <MobileHeader />
        <div className="min-h-screen bg-zinc-950 md:ml-64">
          <main className="p-6">{children}</main>
        </div>
        <AIChatSidebar />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
