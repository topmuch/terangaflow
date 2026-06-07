"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bus,
  MessageCircle,
  MapPin,
  Clock,
  Tag,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Store,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface StationData {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
}

interface MerchantData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  whatsapp: string | null;
  mapsUrl: string | null;
  promoText: string | null;
  logo: string | null;
  station: StationData;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, { emoji: string; label: string }> = {
  restaurant: { emoji: "🍽️", label: "Restaurant" },
  boutique: { emoji: "🛍️", label: "Boutique" },
  transport: { emoji: "🚌", label: "Transport" },
  service: { emoji: "🔧", label: "Service" },
  banque: { emoji: "🏦", label: "Banque" },
  telecom: { emoji: "📱", label: "Télécom" },
  autre: { emoji: "📦", label: "Autre" },
};

/** Strip spaces, dashes, and plus from a phone number for WhatsApp URL. */
function cleanWhatsappNumber(raw: string): string {
  return raw.replace(/[\s\-+()]/g, "");
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header skeleton */}
      <div className="bg-amber-500 px-4 py-3 flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg bg-amber-400" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32 bg-amber-400" />
          <Skeleton className="h-3 w-24 bg-amber-400" />
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="flex-1 p-6 space-y-6 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
        <Separator />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ─── 404 Page ──────────────────────────────────────────────────────────────────

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-amber-500 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="h-9 w-9 rounded-lg bg-amber-600 flex items-center justify-center">
          <Bus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">
            TerangaFlow
          </h1>
          <p className="text-xs text-amber-100">Partenaire non trouvé</p>
        </div>
      </header>

      {/* 404 Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-center max-w-sm"
        >
          <div className="mb-6">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-amber-50 mb-4">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Partenaire introuvable
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Ce partenaire n&apos;existe plus ou a été désactivé. Veuillez
            scanner un autre code QR pour retrouver un partenaire actif.
          </p>

          <Separator className="mb-6" />

          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
            <Bus className="h-4 w-4" />
            <span>Propulsé par TerangaFlow</span>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 text-center border-t bg-gray-50">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} TerangaFlow — Intelligence des gares,
          hospitalité en plus.
        </p>
      </footer>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

export default function PublicMerchantPage() {
  const params = useParams<{ stationId: string; merchantId: string }>();
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Fetch merchant data
  useEffect(() => {
    let cancelled = false;

    async function fetchMerchant() {
      try {
        const res = await fetch(`/api/public/merchants/${params.merchantId}`);
        if (cancelled) return;

        if (res.status === 404) {
          setNotFound(true);
          return;
        }

        if (!res.ok) {
          setNotFound(true);
          return;
        }

        const data: MerchantData = await res.json();
        if (cancelled) return;
        setMerchant(data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMerchant();
    return () => {
      cancelled = true;
    };
  }, [params.merchantId]);

  // Set page title for SEO
  useEffect(() => {
    if (merchant) {
      document.title = `${merchant.name} — ${merchant.station.name} | TerangaFlow`;
    } else if (notFound) {
      document.title = "Partenaire introuvable | TerangaFlow";
    }
  }, [merchant, notFound]);

  // ─── Render States ─────────────────────────────────────────────────────────

  if (loading) return <LoadingSkeleton />;
  if (notFound || !merchant) return <NotFoundPage />;

  const categoryInfo = CATEGORY_ICONS[merchant.category] ?? CATEGORY_ICONS.autre;
  const whatsappUrl = merchant.whatsapp
    ? `https://wa.me/${cleanWhatsappNumber(merchant.whatsapp)}?text=${encodeURIComponent(
        `Bonjour, je vous contacte depuis TerangaFlow - Gare ${merchant.station.name}`
      )}`
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <header className="bg-amber-500 px-4 py-3 flex items-center gap-3 shadow-sm">
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="h-9 w-9 rounded-lg bg-amber-600 flex items-center justify-center shadow-md"
        >
          <Bus className="h-5 w-5 text-white" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight truncate">
            {merchant.station.name}
          </h1>
          <p className="text-xs text-amber-100 truncate">
            {merchant.station.city}, {merchant.station.country}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1.5 bg-amber-600/60 rounded-full px-3 py-1"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-amber-100" />
          <span className="text-xs font-medium text-amber-100">
            TerangaFlow
          </span>
        </motion.div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="max-w-lg mx-auto w-full px-4 py-6 space-y-6"
        >
          {/* ─── Merchant Hero Section ────────────────────────────────────── */}
          <motion.section variants={fadeUp} className="text-center">
            {/* Logo or Emoji Avatar */}
            <div className="flex flex-col items-center gap-4 mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0.15,
                }}
                className="relative"
              >
                {merchant.logo ? (
                  <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-amber-100 shadow-lg">
                    <img
                      src={merchant.logo}
                      alt={merchant.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center border-4 border-amber-100 shadow-lg">
                    <span className="text-4xl">{categoryInfo.emoji}</span>
                  </div>
                )}
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {merchant.name}
                </h2>
                <Badge
                  variant="secondary"
                  className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                >
                  <Store className="h-3 w-3 mr-1" />
                  {categoryInfo.label}
                </Badge>
              </div>
            </div>

            {/* Description */}
            {merchant.description && (
              <motion.div variants={fadeUp}>
                <Card className="border-amber-100 bg-amber-50/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {merchant.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.section>

          {/* ─── CTA Buttons ─────────────────────────────────────────────── */}
          <motion.section
            variants={fadeUp}
            className="space-y-3"
          >
            {(whatsappUrl || merchant.mapsUrl) && (
              <div className="flex items-center gap-2 mb-1">
                <ChevronRight className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-gray-700">
                  Contacter ce partenaire
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {whatsappUrl && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    asChild
                    size="lg"
                    className="w-full h-13 bg-green-600 hover:bg-green-700 text-white font-semibold text-base rounded-xl shadow-md hover:shadow-lg transition-all gap-3"
                  >
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>WhatsApp</span>
                    </a>
                  </Button>
                </motion.div>
              )}

              {merchant.mapsUrl && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="w-full h-13 font-semibold text-base rounded-xl border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all gap-3"
                  >
                    <a
                      href={merchant.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="h-5 w-5 text-red-500" />
                      <span>Voir sur Maps</span>
                      <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                    </a>
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.section>

          {/* ─── Separator ────────────────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <Separator />
          </motion.div>

          {/* ─── Promo Section ────────────────────────────────────────────── */}
          {merchant.promoText && (
            <motion.section variants={fadeUp}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                            Offre spéciale
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 leading-relaxed">
                          {merchant.promoText}
                        </p>
                      </div>
                    </div>
                    {/* Decorative accent bar */}
                    <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />
                  </CardContent>
                </Card>
              </motion.div>
            </motion.section>
          )}

          {/* ─── Station Info Card ────────────────────────────────────────── */}
          <motion.section variants={fadeUp}>
            <Card className="bg-gray-50 border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Bus className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                      Gare
                    </p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {merchant.station.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {merchant.station.city}, {merchant.station.country}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-auto border-t bg-gray-50"
      >
        <div className="max-w-lg mx-auto w-full px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            <Bus className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500">
              Propulsé par{" "}
              <span className="font-bold text-amber-600">TerangaFlow</span>
            </span>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-1">
            Intelligence des gares, hospitalité en plus.
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
