import type { Metadata, Viewport } from "next";
import { Amiri, Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  weight: ["400", "700"],
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "Tajweed Academy | Islamic Tajweed Learning Platform",
  description:
    "Learn and master Tajweed rules through structured Marḥalah courses, exercises, and assessments.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#064e3b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${amiri.variable} h-full`}>
      <body className="min-h-full flex flex-col islamic-pattern">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
