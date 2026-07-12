import type { Metadata, Viewport } from "next";
import { Amiri, Inter, Playfair_Display } from "next/font/google";
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

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Tajweed Classes",
  title: "Tajweed Classes | Quranic Tajweed Learning",
  description:
    "Learn and master Tajweed rules through structured Marḥalah courses, exercises, and assessments.",
  appleWebApp: {
    capable: true,
    title: "Tajweed Classes",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#064e3b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${amiri.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full flex flex-col islamic-pattern overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
