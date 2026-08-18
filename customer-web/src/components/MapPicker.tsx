import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "./Icons";
import { MapTouchScroll } from "./MapTouchScroll";
import "./map-picker.css";

export interface LatLng { lat: number; lng: number; }

// Inline SVG pin as a divIcon — avoids Leaflet's broken default marker-image paths.
const pinIcon = L.divIcon({
  className: "sd-map__pin",
  html:
    '<svg viewBox="0 0 24 24" width="34" height="34"><path fill="#1656c7" stroke="#fff" stroke-width="1.2" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.7" fill="#fff"/></svg>',
  iconSize: [34, 34],
  iconAnchor: [17, 32],
});

function ClickHandler({ onSet }: { onSet: (v: LatLng) => void }) {
  useMapEvents({ click(e) { onSet({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return null;
}

function Recenter({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 15));
  }, [value, map]);
  return null;
}

export function MapPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng) => void }) {
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const center: [number, number] = value ? [value.lat, value.lng] : [-1.2921, 36.8219]; // Nairobi default

  // Show the user's current location by default — drop the pin there on first load.
  useEffect(() => {
    if (value || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
    // run once on mount
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true); setNotFound(false);
    try {
      // OpenStreetMap Nominatim geocoding, biased to Kenya.
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ke&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (rows.length) onChange({ lat: Number(rows[0].lat), lng: Number(rows[0].lon) });
      else setNotFound(true);
    } catch { setNotFound(true); }
    finally { setSearching(false); }
  };

  return (
    <div>
      <div className="sd-map">
        <form className="sd-map__search" onSubmit={search}>
          <input value={query} onChange={(e) => { setQuery(e.target.value); setNotFound(false); }} placeholder="Search location…" aria-label="Search location" />
          <button type="submit" aria-label="Search" disabled={searching}><Icon name="search" size={16} /></button>
        </form>
        <MapContainer center={center} zoom={value ? 15 : 12} scrollWheelZoom={false} zoomControl={false} className="sd-map__canvas">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
          <MapTouchScroll />
          <ClickHandler onSet={onChange} />
          <Recenter value={value} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{ dragend: (e) => { const m = (e.target as L.Marker).getLatLng(); onChange({ lat: m.lat, lng: m.lng }); } }}
            />
          )}
        </MapContainer>
      </div>
      <div className="sd-map__row">
        <button type="button" className="sd-map__btn" onClick={useMyLocation}>
          <Icon name="pin" size={15} /> {locating ? "Locating…" : "Use My Current Location"}
        </button>
        <span className="sd-map__hint">
          {notFound ? "Location not found — tap the map to drop a pin." :
            value ? `Pin set: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "Tap the map to drop a pin"}
        </span>
      </div>
    </div>
  );
}
