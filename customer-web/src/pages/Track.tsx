import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { RequestStatusView } from "../components/RequestStatus";
import { fetchTrack } from "../api/requests";
import { getServiceForm } from "../lib/serviceForms";
import { usePageTitle } from "../lib/usePageTitle";

export default function Track() {
  const { token = "" } = useParams();
  usePageTitle("Track your request — SMART Drill");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["track", token],
    queryFn: () => fetchTrack(token),
    retry: false,
    refetchInterval: 30000,
  });

  return (
    <>
      <Header />
      {isLoading && <div className="sd-section"><div className="sd-container" style={{ textAlign: "center", color: "var(--sd-muted)" }}>Loading your request…</div></div>}

      {isError && (
        <section className="sd-section"><div className="sd-container" style={{ textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <h1 style={{ marginBottom: 8 }}>Request not found</h1>
          <p style={{ color: "var(--sd-muted)", marginBottom: 18 }}>We couldn't find a request for that link. Please check the link from your SMS or email.</p>
          <Link to="/" className="sd-btn sd-btn--primary sd-btn--lg">Back to Home</Link>
        </div></section>
      )}

      {data && (
        <RequestStatusView
          name={data.customer_name}
          serviceName={data.service_name}
          requestNo={data.request_no}
          submittedAt={new Date(data.created_at)}
          status={data.status}
          serviceKey={data.service_key}
          accent={getServiceForm(data.service_key).accent}
          title="Here's your request status"
          subtitle="We'll keep you updated at every step. This page refreshes automatically."
        />
      )}
      <Footer />
    </>
  );
}
