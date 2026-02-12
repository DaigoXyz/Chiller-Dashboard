import { Navigate, Route, Routes } from "react-router-dom";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ErrorLogsPage from "./pages/ListTable";
import LoginPage from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Sidebar />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/logs" element={<ErrorLogsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<div className="p-6">404 - Page Not Found</div>} />
    </Routes>
  );
}
