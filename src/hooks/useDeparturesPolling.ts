"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DeparturesResponse, DepartureItem } from "@/types/signage";

interface DeparturesPollingState {
  departures: DepartureItem[];
  tickerMessages: DeparturesResponse["tickerMessages"];
  stationName: string;
  stationCode: string;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Polling hook that fetches departures every 30 seconds.
 * Fetches immediately on mount, then at the specified interval.
 */
export function useDeparturesPolling(
  stationId: string
): DeparturesPollingState {
  const [departures, setDepartures] = useState<DepartureItem[]>([]);
  const [tickerMessages, setTickerMessages] = useState<
    DeparturesResponse["tickerMessages"]
  >([]);
  const [stationName, setStationName] = useState("");
  const [stationCode, setStationCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // ─── Fetch function ──────────────────────────────────────────────────────
  const fetchDepartures = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const res = await fetch(`/api/departures/${stationId}`);

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }

      const data: DeparturesResponse = await res.json();

      if (!mountedRef.current) return;

      // Sort by departure time, then by status priority
      const sorted = [...data.departures].sort(
        (a, b) =>
          a.minutesUntilDeparture - b.minutesUntilDeparture ||
          a.departureTime.localeCompare(b.departureTime)
      );

      setDepartures(sorted);
      setTickerMessages(data.tickerMessages);
      setStationName(data.station.name);
      setStationCode(data.station.code);
      setLastUpdated(new Date(data.updatedAt));
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(
        err instanceof Error ? err.message : "Erreur de chargement."
      );
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [stationId]);

  // ─── Initial fetch + polling interval ─────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchDepartures();

    // Start polling
    intervalRef.current = setInterval(() => {
      fetchDepartures();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchDepartures]);

  return {
    departures,
    tickerMessages,
    stationName,
    stationCode,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchDepartures,
  };
}
