import { Navigate, Outlet } from "react-router-dom";

const isAuthed = () => {
  try {
    return localStorage.getItem("ENTRY_OK") === "1";
  } catch { return false; }
};

export default function ProtectedRoute() {
  return isAuthed() ? <Outlet/> : <Navigate to="/enter" replace />;
}
