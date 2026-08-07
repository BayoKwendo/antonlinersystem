import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth";
import { RequireAuth, RequireRole } from "./auth/guards";
import Shell from "./layout/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ServiceProviders from "./pages/ServiceProviders";
import CustomerRequests from "./pages/CustomerRequests";
import ProviderPayments from "./pages/ProviderPayments";
import QualityAssurance from "./pages/QualityAssurance";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import Customers from "./pages/Customers";
import Payments from "./pages/Payments";
import Categories from "./pages/Categories";
import Complaints from "./pages/Complaints";
import Reviews from "./pages/Reviews";
import Audit from "./pages/Audit";
import Team from "./pages/Team";
import Profile from "./pages/Profile";
import Live from "./pages/Live";
import Sms from "./pages/Sms";
import NotFound from "./pages/NotFound";

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Shell /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/live"
          element={<RequireRole roles={["admin", "assistance", "finance", "owner"]}><Live /></RequireRole>}
        />
        <Route
          path="/providers"
          element={<RequireRole roles={["admin", "assistance", "owner"]}><ServiceProviders /></RequireRole>}
        />
        <Route
          path="/requests"
          element={<RequireRole roles={["admin", "assistance", "owner"]}><CustomerRequests /></RequireRole>}
        />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route
          path="/provider-payments"
          element={<RequireRole roles={["admin", "finance"]}><ProviderPayments /></RequireRole>}
        />
        <Route
          path="/qa"
          element={<RequireRole roles={["admin", "assistance"]}><QualityAssurance /></RequireRole>}
        />
        <Route path="/reports" element={<RequireRole roles={["admin", "assistance", "finance", "owner"]}><Reports /></RequireRole>} />
        <Route path="/settings" element={<RequireRole roles={["admin"]}><Settings /></RequireRole>} />
        <Route
          path="/customers"
          element={<RequireRole roles={["admin", "assistance"]}><Customers /></RequireRole>}
        />
        <Route
          path="/payments"
          element={<RequireRole roles={["admin", "finance"]}><Payments /></RequireRole>}
        />
        <Route path="/services" element={<RequireRole roles={["admin"]}><Categories /></RequireRole>} />
        <Route
          path="/reviews"
          element={<RequireRole roles={["admin", "assistance"]}><Reviews /></RequireRole>}
        />
        <Route
          path="/complaints"
          element={<RequireRole roles={["admin", "assistance"]}><Complaints /></RequireRole>}
        />
        <Route path="/sms" element={<RequireRole roles={["admin", "assistance"]}><Sms /></RequireRole>} />
        <Route path="/team" element={<RequireRole roles={["admin"]}><Team /></RequireRole>} />
        <Route path="/audit" element={<RequireRole roles={["admin"]}><Audit /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
