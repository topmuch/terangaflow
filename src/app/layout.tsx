import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TerangaFlow — L'intelligence des gares, l'hospitalité en plus",
  description:
    "Transformez vos écrans en sources de revenus avec l'affichage temps réel, la marketplace locale et les notifications push. Plateforme SaaS pour gares routières et ferroviaires en Afrique.",
  keywords: [
    "TerangaFlow",
    "affichage dynamique",
    "gare",
    "transport",
    "temps réel",
    "Sénégal",
    "Afrique",
    "DOOH",
    "marketplace",
    "SaaS",
  ],
  authors: [{ name: "TerangaFlow Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚉</text></svg>",
    apple:
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚉</text></svg>",
  },
  openGraph: {
    title: "TerangaFlow — L'intelligence des gares",
    description:
      "Plateforme SaaS d'affichage dynamique temps réel pour gares. Affichage, marketplace, push, analytics.",
    type: "website",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "TerangaFlow",
    "theme-color": "#0B0F19",
    "msapplication-TileColor": "#0B0F19",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <meta name="theme-color" content="#0B0F19" />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
