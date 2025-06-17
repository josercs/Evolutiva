// src/components/AuthRoute.tsx
import { Navigate, Outlet } from "react-router-dom";

export const AuthRoute = () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) return <Navigate to="/login" />;
  if (!user.onboarding_done) return <Navigate to="/onboarding" />;
  return <Outlet />;
};