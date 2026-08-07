import { useEffect, useRef, useState } from "react";
import { wsUrl } from "../api/client";

export interface LiveCoord {
  lat: number;
  lng: number;
  ts: number;
}

export interface LiveTrackState {
  /** Latest known provider position, or null until the first fix arrives. */
  coord: LiveCoord | null;
  /** True while the provider is actively publishing; false once offline/paused. */
  live: boolean;
  /** True while the WebSocket is open. */
  connected: boolean;
}

const MAX_BACKOFF_MS = 15000;

/**
 * Read-only live driver tracking over the ROOT /ws endpoint.
 *
 * Opens `wsUrl('/ws')?track=<token>` when enabled. The server resolves the
 * tracking token to a single booking, auto-subscribes this socket, and marks it
 * SUBSCRIBE-ONLY — so we send nothing and only receive `location`/`offline`
 * frames. Reconnects with exponential backoff on unexpected close while enabled,
 * and tears everything down on unmount or when `enabled` flips false.
 */
export function useLiveTrack(
  trackingToken: string,
  opts: { enabled: boolean },
): LiveTrackState {
  const { enabled } = opts;
  const [coord, setCoord] = useState<LiveCoord | null>(null);
  const [live, setLive] = useState(false);
  const [connected, setConnected] = useState(false);

  // Refs survive re-renders without re-triggering the connect effect.
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !trackingToken) {
      return () => {
        mountedRef.current = false;
      };
    }

    let closedByUs = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      // Guard against double-connect.
      if (socketRef.current) return;

      let ws: WebSocket;
      try {
        ws = new WebSocket(
          `${wsUrl("/ws")}?track=${encodeURIComponent(trackingToken)}`,
        );
      } catch {
        scheduleReconnect();
        return;
      }
      socketRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        attemptRef.current = 0; // reset backoff on a clean open
        setConnected(true);
      };

      ws.onmessage = (ev) => {
        if (!mountedRef.current) return;
        let msg: unknown;
        try {
          msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
        } catch {
          return; // ignore non-JSON frames
        }
        if (!msg || typeof msg !== "object") return;
        const m = msg as { type?: unknown; lat?: unknown; lng?: unknown };
        if (
          m.type === "location" &&
          typeof m.lat === "number" &&
          typeof m.lng === "number"
        ) {
          setCoord({ lat: m.lat, lng: m.lng, ts: Date.now() });
          setLive(true);
        } else if (m.type === "offline") {
          // Keep the last coord as "last seen"; just flip live off.
          setLive(false);
        }
        // any other message type is ignored
      };

      ws.onclose = () => {
        if (socketRef.current === ws) socketRef.current = null;
        if (!mountedRef.current) return;
        setConnected(false);
        setLive(false);
        if (!closedByUs && enabled) scheduleReconnect();
      };

      ws.onerror = () => {
        // Let onclose drive the reconnect; closing here avoids a dangling socket.
        try {
          ws.close();
        } catch {
          /* noop */
        }
      };
    };

    const scheduleReconnect = () => {
      if (closedByUs || !mountedRef.current) return;
      clearReconnect();
      const delay = Math.min(
        MAX_BACKOFF_MS,
        1000 * 2 ** attemptRef.current,
      );
      attemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    connect();

    return () => {
      mountedRef.current = false;
      closedByUs = true;
      clearReconnect();
      attemptRef.current = 0;
      const ws = socketRef.current;
      socketRef.current = null;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        try {
          ws.close();
        } catch {
          /* noop */
        }
      }
    };
  }, [trackingToken, enabled]);

  return { coord, live, connected };
}
