import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";

// Request/track/account routes are lazy-split so the homepage bundle stays lean
// (Leaflet etc. only load on those routes).
const ServiceRequest = lazy(() => import("./pages/ServiceRequest"));
const Track = lazy(() => import("./pages/Track"));
const MyRequests = lazy(() => import("./pages/MyRequests"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/request/:key" element={<ServiceRequest />} />
        <Route path="/track/:token" element={<Track />} />
        <Route path="/my-requests" element={<MyRequests />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
