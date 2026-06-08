"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CsvUploaderProps {
  stationId: string;
  onSuccess?: () => void;
}

interface ImportResult {
  imported: number;
  ignored: number;
}

export default function CsvUploader({ stationId, onSuccess }: CsvUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = (selected: File): boolean => {
    if (!selected.name.endsWith(".csv")) {
      setError("Veuillez sélectionner un fichier .csv");
      return false;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError("Le fichier ne doit pas dépasser 5 Mo.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const dropped = e.dataTransfer.files[0];
    if (dropped && validateFile(dropped)) {
      setFile(dropped);
      setResult(null);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected && validateFile(selected)) {
        setFile(selected);
        setResult(null);
      }
    },
    []
  );

  const handleClear = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("csv", file);

      const res = await fetch(`/api/station/${stationId}/trips/import`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Erreur ${res.status}`);
      }

      const data: ImportResult = await res.json();
      setResult(data);

      toast({
        title: "Import réussi",
        description: `${data.imported} trajet${data.imported > 1 ? "s" : ""} importé${data.imported > 1 ? "s" : ""}${data.ignored > 0 ? `, ${data.ignored} ligne${data.ignored > 1 ? "s" : ""} ignorée${data.ignored > 1 ? "s" : ""}` : ""}.`,
      });

      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue lors de l'import.";
      setError(message);

      toast({
        title: "Erreur d'import",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── Upload Zone ───────────────────────────────────────────── */}
      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        animate={{
          scale: isDragging ? 1.01 : 1,
          borderColor: isDragging
            ? "rgba(245, 158, 11, 0.6)"
            : "transparent",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={cn(
          "relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors",
          isDragging
            ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10"
            : file
            ? "border-amber-300 bg-amber-50/50 dark:bg-amber-500/5"
            : "border-muted-foreground/25 bg-muted/30 hover:border-amber-400/60 hover:bg-amber-50/30 dark:hover:bg-amber-500/5",
          isUploading && "pointer-events-none opacity-70"
        )}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Zone de dépôt pour fichier CSV"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file-selected"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} Ko
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  isDragging
                    ? "bg-amber-200 dark:bg-amber-500/30"
                    : "bg-muted dark:bg-muted/50"
                )}
              >
                <Upload
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isDragging
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isDragging
                    ? "Déposez le fichier ici"
                    : "Glissez-déposez votre fichier CSV"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ou cliquez pour sélectionner
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Error ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
            <button
              onClick={handleClear}
              className="ml-auto shrink-0 rounded p-1 hover:bg-red-100 dark:hover:bg-red-500/20"
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Result Summary ─────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {result.imported} trajet{result.imported > 1 ? "s" : ""} importé
              {result.imported > 1 ? "s" : ""}
              {result.ignored > 0 &&
                `, ${result.ignored} ligne${result.ignored > 1 ? "s" : ""} ignorée${result.ignored > 1 ? "s" : ""}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Upload Progress ────────────────────────────────────────── */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Import en cours…</span>
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                Analyse du fichier
              </span>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Action Buttons ─────────────────────────────────────────── */}
      {(file || result) && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="min-h-[44px] min-w-[44px] bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Import en cours…" : "Importer les trajets"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isUploading}
            className="min-h-[44px] min-w-[44px]"
          >
            {result ? "Nouvel import" : "Supprimer le fichier"}
          </Button>
        </div>
      )}

      {/* ─── CSV Format Example ─────────────────────────────────────── */}
      <Separator className="my-2" />

      <Card className="bg-muted/40">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Format CSV attendu
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <pre className="overflow-x-auto rounded-lg bg-background p-3 text-xs leading-relaxed text-foreground/80">
{`codeLigne,operateur,heureDepart,dureeMinutes,quai,statut
DKR-SL,Diarra Express,08:30,180,,scheduled
DKR-TH,Sarr Express,09:15,240,A1,delayed
DKR-ZG,Allo Transport,10:00,60,B2,`}
          </pre>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium">codeLigne</span> – code de la ligne (ex: DKR-SL)
            </p>
            <p>
              <span className="font-medium">operateur</span> – nom de l&apos;opérateur
            </p>
            <p>
              <span className="font-medium">heureDepart</span> – heure au format HH:MM
            </p>
            <p>
              <span className="font-medium">dureeMinutes</span> – durée en minutes
            </p>
            <p>
              <span className="font-medium">quai</span> – numéro de quai (optionnel)
            </p>
            <p>
              <span className="font-medium">statut</span> – scheduled, boarding, delayed, departed, cancelled, arrived (optionnel)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
