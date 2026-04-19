'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Store, Globe, MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MerchantFormProps {
  stationId: string;
}

interface FormState {
  name: string;
  category: string;
  description: string;
  offerText: string;
  offerCode: string;
  contactUrl: string;
  website: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  category: 'RESTAURANT',
  description: '',
  offerText: '',
  offerCode: '',
  contactUrl: '',
  website: '',
};

export function MerchantForm({ stationId }: MerchantFormProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId,
          name: data.name,
          category: data.category,
          description: data.description || null,
          offerText: data.offerText || null,
          offerCode: data.offerCode || null,
          contactUrl: data.contactUrl || null,
          website: data.website || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast.success('Partenaire ajoute avec succes');
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Le nom du partenaire est obligatoire');
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setForm(EMPTY_FORM);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Nouveau partenaire
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            Ajouter un partenaire
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Ajoutez un commerce ou service visible sur l&apos;ecran kiosk.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="m-name" className="text-slate-300">
                Nom <span className="text-red-400">*</span>
              </Label>
              <Input
                id="m-name"
                placeholder="Chez Tonton"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-category" className="text-slate-300">
                Categorie
              </Label>
              <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                  <SelectItem value="TAXI">Taxi</SelectItem>
                  <SelectItem value="HOTEL">Hotel</SelectItem>
                  <SelectItem value="SHOP">Boutique</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="TRANSPORT">Transport</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="m-desc" className="text-slate-300">
              Description
            </Label>
            <Textarea
              id="m-desc"
              placeholder="Restaurant senegalais traditionnel..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              maxLength={200}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Offer + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="m-offer" className="text-slate-300">
                Offre speciale
              </Label>
              <Input
                id="m-offer"
                placeholder="-10% avec ce code"
                value={form.offerText}
                onChange={(e) => updateField('offerText', e.target.value)}
                maxLength={50}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-code" className="text-slate-300">
                Code promo
              </Label>
              <Input
                id="m-code"
                placeholder="GARE10"
                value={form.offerCode}
                onChange={(e) => updateField('offerCode', e.target.value)}
                maxLength={20}
                className="bg-slate-800 border-slate-700 text-white font-mono uppercase"
              />
            </div>
          </div>

          {/* Contact URL + Website */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="m-contact" className="text-slate-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp / Contact
              </Label>
              <Input
                id="m-contact"
                placeholder="https://wa.me/221..."
                value={form.contactUrl}
                onChange={(e) => updateField('contactUrl', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-website" className="text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Site web
              </Label>
              <Input
                id="m-website"
                placeholder="https://..."
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setForm(EMPTY_FORM);
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
