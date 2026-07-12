import { useEffect, useRef, useState } from "react";
import { tokens } from "../api/client";

function wsUrl(): string {
  // Same-origin by default (reverse proxy forwards /ws to the backend). Only when
  // VITE_API_URL is an ABSOLUTE url do we take its host — for a cross-origin API.
  const env = import.meta.env.VITE_API_URL as string | undefined;
  let host = window.location.host;
  let secure = window.location.protocol === "https:";
  if (env && /^https?:\/\//i.test(env)) {
    const u = new URL(env);
    host = u.host;
    secure = u.protocol === "https:";
  }
  return `${secure ? "wss" : "ws"}://${host}/ws?token=${tokens.access ?? ""}`;
}

/** Subscribe to a booking's live provider location over the authenticated WS. */
export function useBookingTrack(bookingId: number) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [online, setOnline] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl());
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe", bookingId }));
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(typeof e.data === "string" ? e.data : "");
        if (m.type === "location") {
          setPos({ lat: m.lat, lng: m.lng });
          setOnline(true);
        } else if (m.type === "offline") {
          setOnline(false);
        }
      } catch { /* ignore */ }
    };
    ws.onclose = () => setOnline(false);
    return () => ws.close();
  }, [bookingId]);

  return { pos, online };
}
