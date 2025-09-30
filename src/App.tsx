import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import "./styles.css";

const Enter   = lazy(()=>import("./routes/Enter"));
const Home    = lazy(()=>import("./routes/Home"));
const Express = lazy(()=>import("./routes/ExpressPage"));
const Taxi    = lazy(()=>import("./routes/Taxi"));
const Quick   = lazy(()=>import("./routes/Quick"));
const Bullet  = lazy(()=>import("./routes/Bullet"));
const MapSummary = lazy(()=>import("./routes/MapSummary"));

export default function App() {
  return (
    <BrowserRouter>
      <div className="route-shell">
        <Suspense fallback={<div className="loading-overlay"><div className="spinner"/></div>}>
          <Routes>
            <Route path="/enter" element={<Enter/>} />
            <Route element={<ProtectedRoute/>}>
              <Route path="/"         element={<><Header/><Home/></>} />
              <Route path="/express"  element={<><Header/><Express/></>} />
              <Route path="/map-summary" element={<><Header/><MapSummary/></>} />
              <Route path="/taxi"     element={<><Header/><Taxi/></>} />
              <Route path="/quick"    element={<><Header/><Quick/></>} />
              <Route path="/bullet"   element={<><Header/><Bullet/></>} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
