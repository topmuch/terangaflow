"use client";

import { useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

import { useRealTimeClock } from "@/hooks/useRealTimeClock";
import { useKioskMode } from "@/hooks/useKioskMode";
import { useDeparturesPolling } from "@/hooks/useDeparturesPolling";

import { SignageHeader } from "@/components/signage/Header";
import { DeparturesTable } from "@/components/signage/DeparturesTable";
import { Ticker } from "@/components/signage/Ticker";
import { SignageFooter } from "@/components/signage/Footer";

// ─── Loading / Error Skeleton ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-950">
      <div className="h-16 bg-gray-900" />
      <div className="flex-1 flex flex-col gap-4 p-6">
        <div className="h-12 w-full rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-12 w-full rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-12 w-full rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-12 w-full rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-12 w-full rounded-lg bg-gray-100 animate-pulse" />
      </div>
      <div className="h-16 bg-gray-900" />
    </div>
  );
}

function StationNotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-gray-950 gap-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20"
      >
        <span className="text-4xl">🚉</span>
      </motion.div>
      <h1 className="text-2xl font-bold">Gare introuvable</h1>
      <p className="text-muted-foreground text-center max-w-md">
        L&apos;identifiant de la gare est invalide ou la gare a été désactivée.
      </p>
    </div>
  );
}

// ─── Main Display Page ──────────────────────────────────────────────────────────

export default function DisplayPage() {
  const params = useParams<{ stationId: string }>();
  const stationId = params.stationId;

  const clock = useRealTimeClock("Africa/Dakar");
  const kiosk = useKioskMode();
  const polling = useDeparturesPolling(stationId);

  // ─── Online/offline detection ────────────────────────────────────────────
  function subscribeOnline(callback: () => void): () => void {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
      window.removeEventListener("online", callback);
      window.removeEventListener("offline", callback);
    };
  }

  const getOnlineSnapshot = () => navigator.onLine;
  const getServerSnapshot = () => true;

  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerSnapshot
  );

  // ─── 404: invalid station ───────────────────────────────────────────────
  if (polling.error && polling.stationName === "") {
    return <StationNotFound />;
  }

  // ─── Loading state ───────────────────────────────────────────────────────
  if (polling.isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`flex h-screen flex-col bg-white dark:bg-gray-950 ${
        kiosk.isKiosk ? "cursor-none select-none" : ""
      }`}
      style={{
        // Prevent mobile zoom on double-tap
        touchAction: "manipulation",
      }}
    >
      {/* Header with clock, station info, kiosk toggle */}
      <SignageHeader
        clock={clock}
        stationName={polling.stationName}
        stationCode={polling.stationCode}
        kiosk={kiosk}
        isOnline={isOnline}
      />

      {/* Main departures table */}
      <DeparturesTable
        departures={polling.departures}
        isLoading={polling.isLoading}
        error={polling.error}
      />

      {/* Scrolling ticker messages */}
      <Ticker messages={polling.tickerMessages} />

      {/* Footer with status and kiosk controls */}
      <SignageFooter
        lastUpdated={polling.lastUpdated}
        kiosk={kiosk}
        wakeLockActive={kiosk.wakeLockActive}
      />
    </motion.div>
  );
}
