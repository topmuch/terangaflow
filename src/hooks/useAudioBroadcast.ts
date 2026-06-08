"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AudioBroadcastEvent {
  stationId: string;
  type:
    | "driver_call"
    | "passenger_call"
    | "emergency"
    | "departure_alert"
    | "departure_imminent"
    | "custom";
  segments: Array<{ type: "mp3"; src: string } | { type: "tts"; text: string; lang?: string }>;
  triggeredAt: string;
}

// ─── Singleton Socket Manager ────────────────────────────────────────────────

let globalSocket: Socket | null = null;
let refCount = 0;
let initPromise: Promise<Socket> | null = null;

function getOrCreateSocket(): Promise<Socket> {
  if (globalSocket?.connected) return Promise.resolve(globalSocket);
  if (initPromise) return initPromise;

  initPromise = new Promise<Socket>((resolve, reject) => {
    const socket = io("/?XTransformPort=3004", {
      transports: ["websocket", "polling"],
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socket.on("connect", () => {
      globalSocket = socket;
      resolve(socket);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Audio WS] Connection error:", err.message);
      // Still resolve so callers can use the socket (it will reconnect)
      globalSocket = socket;
      if (!socket.connected) {
        resolve(socket);
      }
    });

    socket.on("disconnect", () => {
      console.warn("[Audio WS] Disconnected");
    });
  });

  return initPromise;
}

// ─── Admin Hook: Broadcast to kiosk displays ─────────────────────────────────

export function useAudioBroadcaster(stationId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!stationId) return;

    refCount++;
    let cancelled = false;

    getOrCreateSocket().then((socket) => {
      if (cancelled) return;
      socketRef.current = socket;

      const onConnect = () => {
        if (!cancelled) {
          setIsConnected(true);
          socket.emit("join-station", stationId);
        }
      };
      const onDisconnect = () => {
        if (!cancelled) setIsConnected(false);
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);

      if (socket.connected) {
        setIsConnected(true);
        socket.emit("join-station", stationId);
      }
    });

    return () => {
      cancelled = true;
      refCount--;
      const socket = socketRef.current;
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
      }
    };
  }, [stationId]);

  const broadcast = useCallback(
    (event: Omit<AudioBroadcastEvent, "stationId" | "triggeredAt">) => {
      if (!socketRef.current?.connected || !stationId) return;

      const broadcastEvent: AudioBroadcastEvent = {
        ...event,
        stationId,
        triggeredAt: new Date().toISOString(),
      };

      socketRef.current.emit("audio-broadcast", broadcastEvent);
    },
    [stationId]
  );

  return { isConnected, broadcast };
}

// ─── Kiosk Hook: Listen for audio broadcasts ──────────────────────────────────

export function useKioskAudioReceiver(stationId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AudioBroadcastEvent | null>(null);

  useEffect(() => {
    if (!stationId) return;

    refCount++;
    let cancelled = false;

    getOrCreateSocket().then((socket) => {
      if (cancelled) return;
      socketRef.current = socket;

      const onConnect = () => {
        if (!cancelled) {
          setIsConnected(true);
          socket.emit("join-station", stationId);
        }
      };
      const onDisconnect = () => {
        if (!cancelled) setIsConnected(false);
      };
      const onAudioPlay = (event: AudioBroadcastEvent) => {
        if (!cancelled && event.stationId === stationId) {
          setLastEvent(event);
        }
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("audio-play", onAudioPlay);

      if (socket.connected) {
        setIsConnected(true);
        socket.emit("join-station", stationId);
      }
    });

    return () => {
      cancelled = true;
      refCount--;
      const socket = socketRef.current;
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("audio-play");
      }
    };
  }, [stationId]);

  return { isConnected, lastEvent, clearEvent: () => setLastEvent(null) };
}
