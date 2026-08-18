import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapTouchScroll } from "./MapTouchScroll";
import "./live-map.css";

export interface LatLng { lat: number; lng: number; }

// Driver marker — a blue location pin with a small vehicle glyph. Rendered as a
// divIcon (inline SVG) to avoid Leaflet's broken default marker-image paths.
// Dimmed via a modifier class when the feed is paused/offline.
function driverIcon(live: boolean): L.DivIcon {
  return L.divIcon({
    className: `sd-livemap__driver${live ? "" : " sd-livemap__driver--paused"}`,
    html:
      '<span class="sd-livemap__pulse"></span>' +
      '<svg viewBox="0 0 24 24" width="40" height="40">' +
      '<path fill="#1656c7" stroke="#fff" stroke-width="1.2" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z"/>' +
      '<path fill="#fff" d="M8.2 8.1l.5-1.4a.9.9 0 0 1 .85-.6h4.9a.9.9 0 0 1 .85.6l.5 1.4c.5.14.85.6.85 1.14v2.3a.6.6 0 0 1-.6.6h-.5a.6.6 0 0 1-.6-.6v-.3H9.05v.3a.6.6 0 0 1-.6.6h-.5a.6.6 0 0 1-.6-.6v-2.3c0-.54.35-1 .85-1.14zm1.15-.05h5.3l-.35-1H9.7zM9 10.3a.6.6 0 1 0 0-1.2.6.6 0 0 0 0 1.2zm6 0a.6.6 0 1 0 0-1.2.6.6 0 0 0 0 1.2z"/>' +
      "</svg>",
    iconSize: [40, 40],
    iconAnchor: [20, 37],
  });
}

// Destination / site marker — rust accent so it's clearly distinct from the driver.
const siteIcon = L.divIcon({
  className: "sd-livemap__site",
  html:
    '<svg viewBox="0 0 24 24" width="32" height="32"><path fill="#e14d16" stroke="#fff" stroke-width="1.2" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.7" fill="#fff"/></svg>',
  iconSize: [32, 32],
  iconAnchor: [16, 30],
});

// Keeps the viewport tracking the driver: follows the latest driver coord, or
// fits both markers when the destination is also known, or centers the site when
// the driver hasn't reported yet.
function Follow({ driver, site }: { driver: LatLng | null; site: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (driver && site) {
      map.fitBounds(
        L.latLngBounds([driver.lat, driver.lng], [site.lat, site.lng]),
        { padding: [48, 48], maxZoom: 16 },
      );
    } else if (driver) {
      map.setView([driver.lat, driver.lng], Math.max(map.getZoom(), 15));
    } else if (site) {
      map.setView([site.lat, site.lng], Math.max(map.getZoom(), 14));
    }
  }, [driver?.lat, driver?.lng, site?.lat, site?.lng, driver, site, map]);
  return null;
}

export interface LiveMapProps {
  driver: LatLng | null;
  site: LatLng | null;
  live: boolean;
  lastSeenAt?: string | null;
}

export function LiveMap({ driver, site, live }: LiveMapProps) {
  // Center priority: driver -> site -> Nairobi default.
  const center: [number, number] = driver
    ? [driver.lat, driver.lng]
    : site
      ? [site.lat, site.lng]
      : [-1.2921, 36.8219];

  return (
    <div className="sd-map">
      <MapContainer
        center={center}
        zoom={driver || site ? 15 : 12}
        scrollWheelZoom={false}
        zoomControl={false}
        className="sd-map__canvas sd-livemap__canvas"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapTouchScroll />
        <Follow driver={driver} site={site} />
        {site && <Marker position={[site.lat, site.lng]} icon={siteIcon} />}
        {driver && <Marker position={[driver.lat, driver.lng]} icon={driverIcon(live)} />}
      </MapContainer>
    </div>
  );
}
