// =============================================================================
//  Authenticated, booking-scoped real-time location tracking (WebSocket).
//
//  Connect:  GET /ws?token=<access JWT>   (browsers can't set WS headers, so
//            the access token is passed as a query param and verified on connect)
//
//  Messages:
//    * provider publishes  { type: "location", bookingId, lat, lng }
//    * either party subscribes { type: "subscribe", bookingId }
//
//  Authorization (per message, against the booking):
//    * only the booking's assigned provider may publish location;
//    * only the booking's customer, its provider, or staff may subscribe.
//
//  Subscribers receive { type: "location", bookingId, lat, lng } per fix and
//  { type: "offline", bookingId } when the publishing provider disconnects.
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

const trackController = {
  handle: async (ctx: Context) => {
    if (!ctx.isUpgradable) {
      ctx.throw(501);
      return;
    }
    // Authenticate before upgrading.
    const token = ctx.request.url.searchParams.get("token") ?? "";
    let userId: number;
    let roles: string[];
    try {
      const claims = await verifyAccessToken(token);
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
      } else if (data.type === "subscribe") {
        if (!isParty) return;
        subscribe(bookingId, socket);
        const last = lastKnown.get(bookingId);
        if (last && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "location", bookingId, lat: last.lat, lng: last.lng }));
        }
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
