import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../api/AuthApi";

export default function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
console.log("auth:", isAuthenticated());

  return <Outlet />;
}
