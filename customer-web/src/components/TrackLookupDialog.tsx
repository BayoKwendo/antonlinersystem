import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Icon } from "./Icons";
import { TrackLookupForm } from "./TrackLookupForm";
import { latestRequest } from "../lib/myRequests";
import "./track-lookup.css";

/** Modal wrapper around the order lookup, opened from the header "Track Order" button. */
export function TrackLookupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const hasSaved = !!latestRequest();

  // Portal to <body> so `position: fixed` is relative to the viewport. (The
  // header sets backdrop-filter, which would otherwise become the containing
  // block for a fixed child and trap the modal inside the header bar.)
  return createPortal(
    <div className="sd-modal" role="dialog" aria-modal="true" aria-labelledby="tl-title" onClick={onClose}>
      <div className="sd-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button className="sd-modal__close" aria-label="Close" onClick={onClose}>×</button>
        <div className="sd-tl__icon"><Icon name="search" size={22} /></div>
        <h2 id="tl-title">Track an Existing Order</h2>
        <p className="sd-modal__sub">Enter the Order ID from your confirmation SMS and the phone number you used to place it.</p>
        <TrackLookupForm onDone={onClose} />
        {hasSaved && (
          <Link to="/my-requests" className="sd-modal__link" onClick={onClose}>View your recent requests →</Link>
        )}
      </div>
    </div>,
    document.body,
  );
}
