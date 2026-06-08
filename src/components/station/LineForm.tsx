"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createLineSchema, type CreateLineInput } from "@/lib/validations/schemas";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LineFormProps {
  stationId: string;
  line?: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LineForm({ stationId, line, onSuccess, onCancel }: LineFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateLineInput>({
    resolver: zodResolver(createLineSchema) as any,
    defaultValues: line
      ? {
          name: line.name,
          code: line.code,
          isActive: line.isActive,
        }
      : {
          name: "",
          code: "",
          isActive: true,
        },
  });

  const formatCode = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9\-]/g, "");
  };

  async function onSubmit(data: CreateLineInput) {
    setIsSubmitting(true);

    try {
      const url = line
        ? `/api/station/${stationId}/lines/${line.id}`
        : `/api/station/${stationId}/lines`;

      const method = line ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Erreur ${res.status}`);
      }

      toast({
        title: line ? "Ligne modifiée" : "Ligne créée",
        description: line
          ? `La ligne « ${data.name} » a été mise à jour.`
          : `La ligne « ${data.name} » a été ajoutée avec succès.`,
        variant: "default",
      });

      form.reset();
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur inattendue est survenue.";

      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* ─── Nom de la ligne ─────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Nom de la ligne
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Dakar – Saint-Louis"
                      {...field}
                      className="min-h-[44px]"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Nom complet de la ligne de transport.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ─── Code ────────────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: DKR-SL"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatCode(e.target.value);
                        field.onChange(formatted);
                      }}
                      value={field.value}
                      className="min-h-[44px] font-mono tracking-wider"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Lettres majuscules, chiffres et tirets uniquement.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ─── Statut actif ─────────────────────────────────────────── */}
            <Separator />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">
                      Ligne active
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Les lignes inactives ne sont pas affichées sur le panneau
                      de départ.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                      aria-label="Activer ou désactiver la ligne"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* ─── Actions ──────────────────────────────────────────────── */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="min-h-[44px] min-w-[44px]"
                >
                  Annuler
                </Button>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "min-h-[44px] min-w-[44px] bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700",
                  isSubmitting && "opacity-70"
                )}
              >
                <AnimatePresence mode="wait">
                  {isSubmitting ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {line ? "Mise à jour…" : "Création…"}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="ready"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {line ? "Modifier la ligne" : "Créer la ligne"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </AnimatePresence>
  );
}
