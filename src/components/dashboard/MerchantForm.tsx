"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MerchantFormProps {
  stationId: string;
  merchant?: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    whatsapp: string | null;
    mapsUrl: string | null;
    promoText: string | null;
    promoExpiry: string | null;
    logo: string | null;
    isActive: boolean;
    displayOrder: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: "restaurant", label: "🍽️ Restaurant" },
  { value: "boutique", label: "🛍️ Boutique" },
  { value: "transport", label: "🚌 Transport" },
  { value: "service", label: "🔧 Service" },
  { value: "banque", label: "🏦 Banque" },
  { value: "telecom", label: "📱 Télécom" },
  { value: "autre", label: "📦 Autre" },
];

export default function MerchantForm({
  stationId,
  merchant,
  onSuccess,
  onCancel,
}: MerchantFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!merchant;

  const [name, setName] = useState(merchant?.name ?? "");
  const [description, setDescription] = useState(merchant?.description ?? "");
  const [category, setCategory] = useState(merchant?.category ?? "autre");
  const [whatsapp, setWhatsapp] = useState(merchant?.whatsapp ?? "");
  const [mapsUrl, setMapsUrl] = useState(merchant?.mapsUrl ?? "");
  const [promoText, setPromoText] = useState(merchant?.promoText ?? "");
  const [promoExpiry, setPromoExpiry] = useState(
    merchant?.promoExpiry
      ? new Date(merchant.promoExpiry).toISOString().slice(0, 16)
      : ""
  );
  const [isActive, setIsActive] = useState(merchant?.isActive ?? true);
  const [displayOrder, setDisplayOrder] = useState(
    merchant?.displayOrder ?? 0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name,
        description: description || undefined,
        category,
        whatsapp: whatsapp || "",
        mapsUrl: mapsUrl || "",
        promoText: promoText || undefined,
        promoExpiry: promoExpiry || undefined,
        isActive,
        displayOrder,
      };

      const url = isEditing
        ? `/api/station/${stationId}/merchants/${merchant.id}`
        : `/api/station/${stationId}/merchants`;

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur inconnue");
      }

      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="merchant-name">Nom *</Label>
        <Input
          id="merchant-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Boutique Nouvelles Frontières"
          required
          maxLength={120}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="merchant-desc">Description</Label>
        <Textarea
          id="merchant-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez brièvement votre activité..."
          rows={3}
          maxLength={500}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="merchant-cat">Catégorie</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="merchant-cat">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label htmlFor="merchant-whatsapp">
          WhatsApp <span className="text-muted-foreground text-xs">(optionnel)</span>
        </Label>
        <Input
          id="merchant-whatsapp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+221 77 123 45 67"
          type="tel"
        />
        <p className="text-xs text-muted-foreground">
          Ce numéro sera utilisé pour le bouton WhatsApp sur la landing page.
        </p>
      </div>

      {/* Maps URL */}
      <div className="space-y-2">
        <Label htmlFor="merchant-maps">
          Google Maps <span className="text-muted-foreground text-xs">(optionnel)</span>
        </Label>
        <Input
          id="merchant-maps"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          placeholder="https://maps.google.com/..."
          type="url"
        />
      </div>

      {/* Promo */}
      <div className="space-y-2">
        <Label htmlFor="merchant-promo">
          Offre promo <span className="text-muted-foreground text-xs">(optionnel)</span>
        </Label>
        <Input
          id="merchant-promo"
          value={promoText}
          onChange={(e) => setPromoText(e.target.value)}
          placeholder="ex: -20% sur tous les accessoires !"
          maxLength={200}
        />
        {promoText && (
          <div className="space-y-1">
            <Label htmlFor="merchant-promo-expiry" className="text-xs">
              Date d&apos;expiration de la promo
            </Label>
            <Input
              id="merchant-promo-expiry"
              type="datetime-local"
              value={promoExpiry}
              onChange={(e) => setPromoExpiry(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Display order */}
      <div className="space-y-2">
        <Label htmlFor="merchant-order">Ordre d&apos;affichage</Label>
        <Input
          id="merchant-order"
          type="number"
          min={0}
          value={displayOrder}
          onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
        />
        <p className="text-xs text-muted-foreground">
          Plus le chiffre est bas, plus le partenaire apparaît en premier.
        </p>
      </div>

      {/* Active toggle */}
      {isEditing && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Partenaire actif</Label>
            <p className="text-xs text-muted-foreground">
              Désactivé = landing page en 404, non visible sur kiosk
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || !name.trim()}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
          {isEditing ? "Modifier" : "Créer le partenaire"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
