import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TerangaFlow — Intelligence des Gares, Hospitalité en Plus",
  description:
    "Plateforme SaaS d'affichage dynamique temps réel pour gares routières et ferroviaires. Ciblant l'Afrique francophone et les marchés émergents.",
  keywords: [
    "TerangaFlow",
    "gare",
    "transport",
    "Afrique",
    "affichage dynamique",
    "SaaS",
    "bus station",
    "train station",
  ],
  authors: [{ name: "TerangaFlow Team" }],
  icons: {
    icon: "/logo.svg",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "TerangaFlow",
    description: "L'intelligence des gares, l'hospitalité en plus.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f59e0b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TerangaFlow" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
