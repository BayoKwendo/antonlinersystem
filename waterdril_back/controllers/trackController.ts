// =============================================================================
//  Real-time, booking-scoped location tracking (WebSocket).
//
//  Connect (two mutually-exclusive credentials):
//    * GET /ws?token=<access JWT>        — the provider (publishes) or a logged-in
//                                          party/staff (subscribes). Browsers can't
//                                          set WS headers, so the JWT is a query param
//                                          and is verified on connect.
//    * GET /ws?track=<tracking_token>    — a frictionless customer holding only the
//                                          read-only tracking token. Auto-bound to
//                                          that one booking, SUBSCRIBE-ONLY (may never
//                                          publish). This is how customer-web watches
//                                          the live map without a login.
//
//  Messages (JWT connections):
//    * provider publishes      { type: "location", bookingId, lat, lng }
//    * either party subscribes  { type: "subscribe", bookingId }
//
//  Authorization (per message, against the booking):
//    * only the booking's assigned provider may publish location;
//    * only the booking's customer, its provider, or staff may subscribe.
//
//  Subscribers receive { type: "location", bookingId, lat, lng } per fix and
//  { type: "offline", bookingId } when the publishing provider disconnects.
//
//  Each published fix is also persisted (bookings.provider_lat/lng/loc_at) so a
//  late-joining viewer and GET /track/:token have an instant last-known position.
// =============================================================================
import { type Context } from "../deps.ts";
import { verifyAccessToken } from "../services/tokenService.ts";
import bookingRepo from "../repositories/bookingRepo.ts";

interface Coord {
  lat: number;
  lng: number;
  ts: number;
}

const STAFF = ["admin", "assistance", "finance"];
const subscribers = new Map<number, Set<WebSocket>>(); // bookingId -> subscriber sockets
const lastKnown = new Map<number, Coord>();

function subscribe(bookingId: number, socket: WebSocket): void {
  let set = subscribers.get(bookingId);
  if (!set) {
    set = new Set();
    subscribers.set(bookingId, set);
  }
  set.add(socket);
}

function unsubscribe(socket: WebSocket): void {
  for (const [bookingId, set] of subscribers) {
    set.delete(socket);
    if (set.size === 0) subscribers.delete(bookingId);
  }
}

function broadcast(bookingId: number, payload: unknown): void {
  const set = subscribers.get(bookingId);
  if (!set || set.size === 0) return;
  const message = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch { /* drop on send error */ }
    }
  }
}

/** Send the last-known coord to a freshly-subscribed socket, once it is open. */
function replayLastKnown(bookingId: number, socket: WebSocket): void {
  const send = () => {
    const last = lastKnown.get(bookingId);
    if (last && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "location", bookingId, lat: last.lat, lng: last.lng }));
    }
  };
  if (socket.readyState === WebSocket.OPEN) send();
  else socket.addEventListener("open", send, { once: true });
}

const trackController = {
  handle: async (ctx: Context) => {
    if (!ctx.isUpgradable) {
      ctx.throw(501);
      return;
    }
    const params = ctx.request.url.searchParams;
    const jwt = params.get("token");
    const trackToken = params.get("track");

    // --- Frictionless, subscribe-only viewer via a read-only tracking token ---
    if (!jwt && trackToken) {
      const booking = await bookingRepo.resolveTrackingToken(trackToken);
      if (!booking) {
        ctx.throw(401);
        return;
      }
      const bookingId = booking.id;
      const socket = ctx.upgrade();
      // Bind immediately (adding to the room before OPEN is safe — broadcast()
      // guards on readyState), then replay the last-known fix once open.
      subscribe(bookingId, socket);
      replayLastKnown(bookingId, socket);
      // Subscribe-only: this connection can never publish, so all inbound
      // messages are ignored. It only receives location/offline broadcasts.
      socket.onclose = () => unsubscribe(socket);
      socket.onerror = () => unsubscribe(socket);
      return;
    }

    // --- Authenticated path (provider publishes; any party/staff subscribes) --
    let userId: number;
    let roles: string[];
    try {
      const claims = await verifyAccessToken(jwt ?? "");
      userId = claims.sub;
      roles = claims.roles;
    } catch {
      ctx.throw(401);
      return;
    }
    const isStaff = roles.some((r) => STAFF.includes(r));
    const socket = ctx.upgrade();
    const publishing = new Set<number>(); // bookingIds this provider socket pushes to

    socket.onmessage = async (event: MessageEvent) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(typeof event.data === "string" ? event.data : "");
      } catch {
        return;
      }
      const bookingId = Number(data.bookingId);
      if (!Number.isInteger(bookingId) || bookingId <= 0) return;

      const parties = await bookingRepo.parties(bookingId);
      if (!parties) return;
      const isProvider = userId === parties.provider_id;
      const isParty = isProvider || userId === parties.customer_id || isStaff;

      if (data.type === "location") {
        if (!isProvider) return; // only the assigned provider may publish
        const lat = Number(data.lat);
        const lng = Number(data.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        lastKnown.set(bookingId, { lat, lng, ts: Date.now() });
        publishing.add(bookingId);
        broadcast(bookingId, { type: "location", bookingId, lat, lng });
        // Best-effort durable snapshot (REST fallback + survives reconnect/restart).
        bookingRepo.saveProviderLocation(bookingId, lat, lng).catch(() => {});
      } else if (data.type === "subscribe") {
        if (!isParty) return;
        subscribe(bookingId, socket);
        replayLastKnown(bookingId, socket);
      }
    };

    const cleanup = () => {
      unsubscribe(socket);
      for (const bookingId of publishing) {
        lastKnown.delete(bookingId);
        broadcast(bookingId, { type: "offline", bookingId });
      }
      publishing.clear();
    };
    socket.onclose = cleanup;
    socket.onerror = cleanup;
  },
};

export default trackController;
