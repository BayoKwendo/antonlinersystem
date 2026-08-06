import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { usePageTitle } from "../lib/usePageTitle";

export default function NotFound() {
  usePageTitle("Page not found — SMART Drill");
  return (
    <>
      <Header />
      <main className="sd-container" style={{ padding: "96px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 40 }}>Page not found</h1>
        <p style={{ color: "var(--sd-muted)", margin: "12px 0 24px" }}>
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link to="/" className="sd-btn sd-btn--primary sd-btn--lg">Back to Home</Link>
      </main>
      <Footer />
    </>
  );
}
