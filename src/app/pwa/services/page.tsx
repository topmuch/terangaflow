"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Store,
  MessageCircle,
  MapPin,
  Tag,
  ExternalLink,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MerchantItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  whatsapp: string | null;
  mapsUrl: string | null;
  promoText: string | null;
  logo: string | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  boutique: "🛍️",
  restaurant: "🍽️",
  telecom: "📱",
  service: "📦",
  banque: "🏦",
  transport: "🚕",
  autre: "🏪",
};

// ─── Services Page ───────────────────────────────────────────────────────────

export default function PwaServicesPage() {
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [stationId] = useState("cmq3355jq0002oxdyh8dnlfku");

  const fetchMerchants = useCallback(async () => {
    try {
      const response = await fetch(`/api/departures/${stationId}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setMerchants(data.merchants || []);
    } catch {
      // Keep cached data
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // Extract unique categories
  const categories = Array.from(new Set(merchants.map((m) => m.category)));

  // Filter merchants
  const filtered = merchants.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !activeCategory || m.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <Store className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold">Services & Boutiques</h1>
            <p className="text-xs text-muted-foreground">
              {merchants.length} partenaire{merchants.length > 1 ? "s" : ""} à votre gare
            </p>
          </div>
        </div>
      </div>

      {/* ─── Search ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un partenaire…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* ─── Category Filters ───────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            className="h-7 px-3 text-xs shrink-0"
            onClick={() => setActiveCategory(null)}
          >
            Tous
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              className="h-7 px-3 text-xs shrink-0 capitalize"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            >
              {CATEGORY_ICONS[cat] || "🏪"} {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* ─── Merchant Cards ─────────────────────────────────────────────── */}
      <div className="px-4 pb-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-3 w-48 mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Store className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Aucun partenaire trouvé"
                  : "Aucun service disponible pour le moment"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((merchant) => (
            <Card
              key={merchant.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Emoji avatar */}
                  <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0">
                    {CATEGORY_ICONS[merchant.category] || "🏪"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">
                        {merchant.name}
                      </h3>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                        {merchant.category}
                      </Badge>
                    </div>

                    {merchant.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {merchant.description}
                      </p>
                    )}

                    {/* Promo badge */}
                    {merchant.promoText && (
                      <div className="mt-2 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-2.5 py-1.5">
                        <Tag className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-[11px] text-amber-700 dark:text-amber-300 line-clamp-1">
                          {merchant.promoText}
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      {merchant.whatsapp && (
                        <Link
                          href={`https://wa.me/${merchant.whatsapp.replace(/[^0-9+]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button
                            size="sm"
                            className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                            WhatsApp
                          </Button>
                        </Link>
                      )}
                      {merchant.mapsUrl && (
                        <Link
                          href={merchant.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs"
                          >
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            Itinéraire
                          </Button>
                        </Link>
                      )}
                      <Link
                        href={`/p/${stationId}/${merchant.id}`}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Voir
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
