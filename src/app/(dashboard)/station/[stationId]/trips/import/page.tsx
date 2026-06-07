"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import CsvUploader from "@/components/station/CsvUploader";

// ─── CSV Template ──────────────────────────────────────────────────────────────

const CSV_TEMPLATE = `operatorName,departureTime,estimatedArrival,lineCode,lineName,status,platform,notes
"Express Sénégal","08:00","10:30","DKR-STL","Dakar - Saint-Louis","scheduled","A1",""
"Somitel","09:30","11:45","DKR-THI","Dakar - Thiès","scheduled","B2","Arrêt intermédiaire à Rufisque"`;

function getTemplateHref() {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function TripsImportPage() {
  const params = useParams();
  const stationId = params.stationId as string;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importer des trajets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importez vos départs depuis un fichier CSV
          </p>
        </div>
        <Link href={`/station/${stationId}/trips`}>
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Retour aux départs
          </Button>
        </Link>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main uploader area */}
        <Card>
          <CardContent className="p-6">
            <CsvUploader
              stationId={stationId}
              onSuccess={() => {
                // Success toast is handled by the CsvUploader component
              }}
            />
          </CardContent>
        </Card>

        {/* Sidebar: help & template */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-100 p-2 mt-0.5">
                  <FileSpreadsheet className="size-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">
                    Format attendu
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Le fichier doit être au format CSV avec les colonnes
                    suivantes en en-tête&nbsp;:
                  </p>
                  <div className="mt-2 rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed text-muted-foreground overflow-x-auto">
                    operatorName, departureTime,<br />
                    estimatedArrival, lineCode,<br />
                    lineName, status, platform,<br />
                    notes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-sm mb-2">Télécharger un modèle</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Utilisez ce fichier modèle comme point de départ pour votre import.
              </p>
              <Button
                asChild
                variant="outline"
                className="w-full border-amber-300 text-amber-600 hover:bg-amber-50"
              >
                <a
                  href={getTemplateHref()}
                  download="trajets-modele.csv"
                >
                  <Download className="size-4" />
                  Télécharger le modèle CSV
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-sm mb-2">Conseils</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Les heures doivent être au format HH:MM</li>
                <li>Le statut peut être&nbsp;: scheduled, delayed, departed, cancelled</li>
                <li>Les lignes seront créées automatiquement si elles n&apos;existent pas</li>
                <li>L&apos;import est cumulatif : il ne remplace pas les départs existants</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
