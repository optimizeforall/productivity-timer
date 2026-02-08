import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/shared/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Productivity Timer",
  description: "Track your work, manage tasks, and visualize your productivity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
