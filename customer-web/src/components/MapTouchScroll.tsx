import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Lets the PAGE scroll when a one-finger vertical swipe passes over an embedded
 * Leaflet map on a touch device. By default Leaflet pans the map on a one-finger
 * drag, which hijacks the page scroll and makes the form feel stuck / jittery.
 *
 * Fix: on touch devices we disable one-finger map dragging and set
 * `touch-action: pan-y` so a vertical swipe scrolls the page straight through the
 * map. Map panning is re-enabled only while two fingers are down (like Google
 * Maps embeds). Tap-to-drop-pin, marker drag, search and "use my location" all
 * still work. Desktop mouse dragging is left completely untouched.
 */
export function MapTouchScroll() {
  const map = useMap();
  useEffect(() => {
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (!isTouch) return; // desktop: keep default mouse dragging

    const el = map.getContainer();
    const relax = () => {
      map.dragging.disable();
      el.style.touchAction = "pan-y"; // vertical page-scroll passes through
    };
    const grab = () => {
      map.dragging.enable();
      el.style.touchAction = "none"; // two-finger pan owns the gesture
    };
    relax();

    const onStart = (e: TouchEvent) => { if (e.touches.length >= 2) grab(); };
    const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) relax(); };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [map]);
  return null;
}
