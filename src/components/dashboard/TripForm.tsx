'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Plus, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TripFormData {
  lineCode: string;
  destination: string;
  scheduledTime: string;
  platform: string;
  status: 'ON_TIME' | 'DELAYED' | 'BOARDING' | 'DEPARTED' | 'CANCELLED';
  delayMinutes: number;
  vehicleNumber: string;
  notes: string;
}

interface TripFormProps {
  onSubmit: (data: TripFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<TripFormData>;
  lines?: { code: string; destination: string; color: string }[];
  platforms?: { number: number; name?: string }[];
  loading?: boolean;
}

const STATUS_OPTIONS: { value: TripFormData['status']; label: string; color: string }[] = [
  { value: 'ON_TIME', label: "À l'heure", color: 'text-green-400' },
  { value: 'DELAYED', label: 'En retard', color: 'text-amber-400' },
  { value: 'BOARDING', label: 'Embarquement', color: 'text-blue-400' },
  { value: 'DEPARTED', label: 'Parti', color: 'text-slate-400' },
  { value: 'CANCELLED', label: 'Annulé', color: 'text-red-400' },
];

const defaultData: TripFormData = {
  lineCode: '',
  destination: '',
  scheduledTime: '',
  platform: '',
  status: 'ON_TIME',
  delayMinutes: 0,
  vehicleNumber: '',
  notes: '',
};

export function TripForm({ onSubmit, onCancel, initialData, lines, platforms, loading }: TripFormProps) {
  const [formData, setFormData] = useState<TripFormData>({ ...defaultData, ...initialData });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const updateField = <K extends keyof TripFormData>(key: K, value: TripFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={handleSubmit}
      className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-5"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-400" />
          {initialData ? 'Modifier le départ' : 'Nouveau départ'}
        </h3>
        <button type="button" onClick={onCancel} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Line */}
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Ligne</Label>
          {lines && lines.length > 0 ? (
            <select
              value={formData.lineCode}
              onChange={(e) => {
                const selected = lines.find((l) => l.code === e.target.value);
                updateField('lineCode', e.target.value);
                if (selected) updateField('destination', selected.destination);
              }}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Sélectionner...</option>
              {lines.map((l) => (
                <option key={l.code} value={l.code}>{l.code} — {l.destination}</option>
              ))}
            </select>
          ) : (
            <Input
              value={formData.lineCode}
              onChange={(e) => updateField('lineCode', e.target.value)}
              placeholder="L10"
              className="bg-slate-800 border-slate-700 text-white"
            />
          )}
        </div>

        {/* Destination */}
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Destination
          </Label>
          <Input
            value={formData.destination}
            onChange={(e) => updateField('destination', e.target.value)}
            placeholder="DAKAR - Gare Centrale"
            className="bg-slate-800 border-slate-700 text-white"
            required
          />
        </div>

        {/* Scheduled Time */}
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Heure prévue
          </Label>
          <Input
            type="time"
            value={formData.scheduledTime}
            onChange={(e) => updateField('scheduledTime', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            required
          />
        </div>

        {/* Platform */}
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Quai</Label>
          {platforms && platforms.length > 0 ? (
            <select
              value={formData.platform}
              onChange={(e) => updateField('platform', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Sélectionner...</option>
              {platforms.map((p) => (
                <option key={p.number} value={`Quai ${p.number}`}>Quai {p.number}{p.name ? ` — ${p.name}` : ''}</option>
              ))}
            </select>
          ) : (
            <Input
              value={formData.platform}
              onChange={(e) => updateField('platform', e.target.value)}
              placeholder="Quai 3"
              className="bg-slate-800 border-slate-700 text-white"
            />
          )}
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Statut</Label>
          <select
            value={formData.status}
            onChange={(e) => updateField('status', e.target.value as TripFormData['status'])}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Delay */}
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Retard (min)
          </Label>
          <Input
            type="number"
            min={0}
            value={formData.delayMinutes}
            onChange={(e) => updateField('delayMinutes', parseInt(e.target.value) || 0)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      {/* Vehicle + Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">N° Véhicule</Label>
          <Input
            value={formData.vehicleNumber}
            onChange={(e) => updateField('vehicleNumber', e.target.value)}
            placeholder="DK-1234-AB"
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Notes</Label>
          <Input
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Info complémentaire..."
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1 gap-2">
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {initialData ? 'Enregistrer' : 'Ajouter'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
          <X className="w-4 h-4" />
          Annuler
        </Button>
      </div>
    </motion.form>
  );
}
