"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, ArrowUpRight, ArrowDownLeft, Calendar } from "lucide-react";

type ViewType = "DEPARTS" | "ARRIVEES";

interface TripData {
  id: string;
  time: string;
  location: string;
  status: string;
  platform?: string | null;
  delayMinutes?: number | null;
}

interface KioskDisplayProps {
  stationName: string;
  initialDepartures: TripData[];
  initialArrivals: TripData[];
  stationId: string;
}

export default function KioskDisplay({
  stationName,
  initialDepartures,
  initialArrivals,
  stationId,
}: KioskDisplayProps) {
  const [currentView, setCurrentView] = useState<ViewType>("DEPARTS");
  const [departures, setDepartures] = useState(initialDepartures);
  const [arrivals, setArrivals] = useState(initialArrivals);

  // 1. Transition Slide automatique toutes les 2 minutes (120 000 ms)
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentView((prev) => (prev === "DEPARTS" ? "ARRIVEES" : "DEPARTS"));
    }, 120000);
    return () => clearInterval(slideTimer);
  }, []);

  // 2. Polling temps réel toutes les 15s (CORRECTION DU BUG : force la mise à jour du statut PARTI)
  useEffect(() => {
    const pollData = async () => {
      try {
        const res = await fetch(`/api/trips/realtime?stationId=${stationId}`);
        if (res.ok) {
          const data = await res.json();
          setDepartures(data.departures);
          setArrivals(data.arrivals);
        }
      } catch (err) {
        console.error("Erreur de mise à jour temps réel:", err);
      }
    };

    const pollInterval = setInterval(pollData, 15000); // 15 secondes pour une réactivité immédiate
    return () => clearInterval(pollInterval);
  }, [stationId]);

  // Formatage de la date EXACT comme le fichier joint : "02 JUN 2026"
  const formatDate = (date: Date) =>
    date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();

  const getStatusLabel = (status: string, delay?: number | null) => {
    switch (status) {
      case "SCHEDULED":
        return "À L'HEURE";
      case "BOARDING":
        return "EMBARQUEMENT";
      case "DEPARTURE_IMMINENT":
        return "DÉPART IMMINENT";
      case "DELAYED":
        return `EN RETARD +${delay || 0}MIN`;
      case "ARRIVED":
        return "ARRIVÉ";
      case "DEPARTED":
        return "PARTI";
      case "CANCELLED":
        return "ANNULÉ";
      default:
        return status;
    }
  };

  // BOUTONS COLORÉS EXPLICITES
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-green-500/20 text-green-400 border-2 border-green-500";
      case "BOARDING":
        return "bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500 animate-pulse";
      case "DEPARTURE_IMMINENT":
        return "bg-red-500/20 text-red-400 border-2 border-red-500 animate-pulse";
      case "DELAYED":
        return "bg-red-600/20 text-red-500 border-2 border-red-600 animate-pulse";
      case "ARRIVED":
        return "bg-blue-500/20 text-blue-400 border-2 border-blue-500";
      case "DEPARTED":
        return "bg-slate-500/20 text-slate-400 border-2 border-slate-500"; // Gris pour Parti
      case "CANCELLED":
        return "bg-slate-600/20 text-slate-400 border-2 border-slate-600 line-through";
      default:
        return "bg-slate-800 text-slate-300 border-2 border-slate-700";
    }
  };

  const currentData = currentView === "DEPARTS" ? departures : arrivals;
  const locationLabel = currentView === "DEPARTS" ? "DESTINATION" : "PROVENANCE";
  const Icon = currentView === "DEPARTS" ? ArrowUpRight : ArrowDownLeft;

  // COLORIS DIFFÉRENT POUR LES ARRIVÉES (Bleu au lieu de Cyan)
  const themeBorder = currentView === "DEPARTS" ? "border-cyan-500" : "border-blue-500";
  const themeText = currentView === "DEPARTS" ? "text-cyan-400" : "text-blue-400";
  const themeBg = currentView === "DEPARTS" ? "from-cyan-500 to-blue-600" : "from-blue-500 to-indigo-600";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans overflow-hidden select-none">
      {/* HEADER (Sans horloge, juste la date) */}
      <header className={`bg-slate-900 border-b-4 ${themeBorder} p-6 flex items-center justify-between shadow-2xl`}>
        <div className="flex items-center gap-4">
          <div className={`bg-gradient-to-br ${themeBg} p-3 rounded-xl shadow-lg`}>
            <Bus className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white">
              TerangaFlow
            </h1>
            <p className={`${themeText} font-bold text-xl tracking-wide`}>
              {stationName.toUpperCase()}
            </p>
          </div>
        </div>

        {/* DATE SEULEMENT (Horloge supprimée) */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-3 text-3xl font-bold text-slate-300">
            <Calendar className="w-8 h-8" />
            {formatDate(new Date())}
          </div>
        </div>
      </header>

      {/* BARRE DE NAVIGATION & PROGRESSION (2 MIN) */}
      <div className="bg-slate-900/80 px-8 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex gap-12">
          <div
            className={`text-3xl font-black tracking-wider transition-all duration-500 ${
              currentView === "DEPARTS"
                ? `${themeText} scale-105`
                : "text-slate-600"
            }`}
          >
            DÉPARTS
          </div>
          <div
            className={`text-3xl font-black tracking-wider transition-all duration-500 ${
              currentView === "ARRIVEES"
                ? `${themeText} scale-105`
                : "text-slate-600"
            }`}
          >
            ARRIVÉES
          </div>
        </div>

        {/* Barre de progression visuelle de 2 minutes */}
        <div className="w-64 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <motion.div
            className={`h-full bg-gradient-to-r ${themeBg}`}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 120,
              ease: "linear",
              repeat: Infinity,
              repeatType: "loop",
            }}
          />
        </div>
      </div>

      {/* CONTENU PRINCIPAL AVEC TRANSITION SLIDE */}
      <main className="flex-1 p-8 relative flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{
              x: currentView === "DEPARTS" ? 100 : -100,
              opacity: 0,
            }}
            animate={{ x: 0, opacity: 1 }}
            exit={{
              x: currentView === "DEPARTS" ? -100 : 100,
              opacity: 0,
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            {/* EN-TÊTE DU TABLEAU */}
            <div
              className={`grid grid-cols-12 gap-4 p-6 bg-slate-900 rounded-t-2xl border-2 ${themeBorder} border-b-0 text-slate-400 font-black text-2xl uppercase tracking-widest`}
            >
              <div className="col-span-3 flex items-center gap-4">HEURE</div>
              <div className="col-span-6 flex items-center gap-4">
                <Icon className="w-8 h-8" /> {locationLabel}
              </div>
              <div className="col-span-3 text-right">STATUT</div>
            </div>

            {/* LISTE DES TRAJETS */}
            <div className="bg-slate-900/50 rounded-b-2xl border-2 border-slate-800 border-t-0 flex-1 overflow-hidden">
              {currentData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-500 text-2xl font-bold">
                  Aucun trajet prévu pour le moment
                </div>
              ) : (
                currentData.map((trip, index) => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-12 gap-4 p-6 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors items-center"
                  >
                    {/* HEURE */}
                    <div className="col-span-3 flex items-center gap-4">
                      <span className="text-5xl font-mono font-bold text-white">
                        {trip.time}
                      </span>
                    </div>

                    {/* DESTINATION / PROVENANCE */}
                    <div className="col-span-6 flex items-center gap-4">
                      <div>
                        <span className="text-3xl font-bold text-white block leading-tight">
                          {trip.location}
                        </span>
                        {trip.platform && (
                          <span className="inline-block mt-2 px-4 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xl text-slate-300 font-bold">
                            {trip.platform}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* STATUT (Bouton Coloré) */}
                    <div className="col-span-3 flex justify-end">
                      <span
                        className={`px-6 py-3 rounded-xl text-2xl font-black border-2 ${getStatusStyle(trip.status)}`}
                      >
                        {getStatusLabel(trip.status, trip.delayMinutes)}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
