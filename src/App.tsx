import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import "./styles.css";

const Enter   = lazy(()=>import("./routes/Enter"));
const Home    = lazy(()=>import("./routes/Home"));
const Express = lazy(()=>import("./routes/Express"));
const Taxi    = lazy(()=>import("./routes/Taxi"));
const Quick   = lazy(()=>import("./routes/Quick"));
const Bullet  = lazy(()=>import("./routes/Bullet"));

const slide = {
  initial: { x: 40, opacity: 0 },
  animate: { x: 0,  opacity: 1, transition: { duration: 0.22 } },
  exit:    { x: -20, opacity: 0, transition: { duration: 0.18 } }
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div className="route-shell">
      <Suspense fallback={<div className="loading-overlay"><div className="spinner"/></div>}>
        <AnimatePresence mode="popLayout">
          <motion.div key={location.pathname} variants={slide} initial="initial" animate="animate" exit="exit">
            <Routes location={location}>
              <Route path="/enter" element={<Enter/>} />
              <Route element={<ProtectedRoute/>}>
                <Route path="/"         element={<><Header/><Home/></>} />
                <Route path="/express"  element={<><Header/><Express/></>} />
                <Route path="/taxi"     element={<><Header/><Taxi/></>} />
                <Route path="/quick"    element={<><Header/><Quick/></>} />
                <Route path="/bullet"   element={<><Header/><Bullet/></>} />
              </Route>
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </div>
  );
}

export default function App(){ return <BrowserRouter><AnimatedRoutes/></BrowserRouter>; }
