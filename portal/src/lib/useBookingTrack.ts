import { useEffect, useRef, useState } from "react";
import { tokens } from "../api/client";

function wsUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:5002/api/v1";
  const u = new URL(base);
  const proto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${u.host}/ws?token=${tokens.access ?? ""}`;
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
