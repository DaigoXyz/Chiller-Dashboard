import { Navigate, Route, Routes } from "react-router-dom";
import ErrorLogsPage from "./pages/ErrorLogsPage";
import LoginPage from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import ChillerOverviewPage from "./pages/ChillerOverviewPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<Sidebar />}>
          <Route index element={<Navigate to="overview" replace />} />
          {/* <Route path="monitoring" element={<ChillerDashboardPage />} /> */}
          <Route path="overview" element={<ChillerOverviewPage />} />
          <Route path="logs" element={<ErrorLogsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<div className="p-6">404 - Page Not Found</div>} />
    </Routes>
  );
}