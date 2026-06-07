"use client";

import { motion } from "framer-motion";
import {
  Store,
  UtensilsCrossed,
  ShoppingBag,
  Bus,
  Wrench,
  Landmark,
  Smartphone,
  Package,
  MessageCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MerchantItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  whatsapp: string | null;
  mapsUrl: string | null;
  promoText: string | null;
}

interface ServicesSectionProps {
  merchants: MerchantItem[];
}

// ─── Category Icon Mapping ────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  restaurant: UtensilsCrossed,
  boutique: ShoppingBag,
  transport: Bus,
  service: Wrench,
  banque: Landmark,
  telecom: Smartphone,
  autre: Package,
};

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category.toLowerCase()] ?? Package;
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ServicesSection({ merchants }: ServicesSectionProps) {
  const params = useParams<{ stationId: string }>();
  const stationId = params.stationId;

  return (
    <section className="flex flex-col">
      {/* Section header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b">
        <Store className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-bold">Services &amp; Partenaires</h2>
        {merchants.length > 0 && (
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {merchants.length} service{merchants.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Merchant grid */}
      <div className="max-h-48 overflow-y-auto px-4 py-3">
        {merchants.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">
              Aucun service disponible
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"
          >
            {merchants.map((merchant) => {
              const IconComponent = getCategoryIcon(merchant.category);

              return (
                <motion.div
                  key={merchant.id}
                  variants={cardVariants}
                  whileHover={{ scale: 1.04, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Link
                    href={`/p/${stationId}/${merchant.id}`}
                    className="flex flex-col items-center gap-1.5 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
                  >
                    {/* Category icon */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Merchant name */}
                    <p className="text-xs font-bold text-center truncate w-full leading-tight">
                      {merchant.name}
                    </p>

                    {/* Indicators row */}
                    <div className="flex items-center gap-1 min-h-[18px]">
                      {merchant.promoText && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                          Promo
                        </span>
                      )}
                      {merchant.whatsapp && (
                        <MessageCircle className="h-3 w-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}
