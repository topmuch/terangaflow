'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LineFormProps {
  stationId: string;
  initialData?: {
    id: string;
    name: string;
    code: string;
    destination: string;
    color: string;
    type: string;
    frequencyMinutes: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormState {
  code: string;
  type: string;
  name: string;
  destination: string;
  frequencyMinutes: string;
  color: string;
}

const LINE_TYPES = [
  { value: 'BUS', label: '🚌 Bus' },
  { value: 'TRAIN', label: '🚆 Train' },
  { value: 'FERRY', label: '⛴️ Ferry' },
  { value: 'TAXI', label: '🚕 Taxi' },
] as const;

const DEFAULT_FORM: FormState = {
  code: '',
  type: 'BUS',
  name: '',
  destination: '',
  frequencyMinutes: '15',
  color: '#10b981',
};

export function LineForm({
  stationId,
  initialData,
  open,
  onOpenChange,
  onSuccess,
}: LineFormProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const isEditing = !!initialData?.id;

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM);
  }, []);

  // Sync form when dialog opens with initial data
  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          code: initialData.code,
          type: initialData.type,
          name: initialData.name,
          destination: initialData.destination,
          frequencyMinutes: String(initialData.frequencyMinutes),
          color: initialData.color,
        });
      } else {
        resetForm();
      }
    }
  }, [open, initialData, resetForm]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        // Edit mode — PATCH
        const res = await fetch('/api/lines', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: initialData!.id,
            code: form.code,
            type: form.type,
            name: form.name,
            destination: form.destination,
            frequencyMinutes: parseInt(form.frequencyMinutes) || 15,
            color: form.color,
          }),
        });

        if (!res.ok) throw new Error('Erreur lors de la modification de la ligne');
        toast.success('Ligne modifiée avec succès');
      } else {
        // Create mode — POST
        const res = await fetch('/api/lines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId,
            code: form.code,
            type: form.type,
            name: form.name,
            destination: form.destination,
            frequencyMinutes: parseInt(form.frequencyMinutes) || 15,
            color: form.color,
          }),
        });

        if (!res.ok) throw new Error('Erreur lors de la création de la ligne');
        toast.success('Ligne créée avec succès');
      }

      // Invalidate TanStack Query cache
      await queryClient.invalidateQueries({ queryKey: ['lines', stationId] });

      // Close dialog & reset
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            {isEditing ? (
              <Pencil className="w-5 h-5 text-emerald-400" />
            ) : (
              <Plus className="w-5 h-5 text-emerald-400" />
            )}
            {isEditing ? 'Modifier la ligne' : 'Nouvelle ligne'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEditing
              ? 'Modifiez les informations de la ligne de transport.'
              : 'Renseignez les informations pour créer une nouvelle ligne.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Code + Type row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                Code
              </Label>
              <Input
                value={form.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                placeholder="L10"
                required
                className="bg-slate-800 border-slate-700 text-white font-mono uppercase tracking-widest placeholder:text-slate-500"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                Type
              </Label>
              <Select
                value={form.type}
                onValueChange={(val) => updateField('type', val)}
              >
                <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white data-[placeholder]:text-slate-500">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {LINE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
              Nom
            </Label>
            <Input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ligne 10 — Dakar Express"
              required
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
              Destination
            </Label>
            <Input
              value={form.destination}
              onChange={(e) => updateField('destination', e.target.value)}
              placeholder="DAKAR — Gare Centrale"
              required
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
              Fréquence (minutes)
            </Label>
            <Input
              type="number"
              min={5}
              value={form.frequencyMinutes}
              onChange={(e) => updateField('frequencyMinutes', e.target.value)}
              placeholder="15"
              required
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Color picker + hex input side by side */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
              Couleur
            </Label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => updateField('color', e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-2 border-slate-700 bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
                />
              </div>
              <Input
                value={form.color}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val) || val === '') {
                    updateField('color', val);
                  }
                }}
                placeholder="#10b981"
                maxLength={7}
                className="flex-1 bg-slate-800 border-slate-700 text-white font-mono placeholder:text-slate-500"
              />
              {/* Color preview swatch */}
              <div
                className="h-10 w-10 rounded-lg border border-slate-700 shrink-0"
                style={{ backgroundColor: form.color || '#000000' }}
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Enregistrement...' : 'Création...'}
                </>
              ) : (
                <>
                  {isEditing ? (
                    <Pencil className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isEditing ? 'Enregistrer' : 'Créer la ligne'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
