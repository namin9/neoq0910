import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Enter from "./routes/Enter";
import Home from "./routes/Home";
import Express from "./routes/Express";
import Taxi from "./routes/Taxi";
import Quick from "./routes/Quick";
import Bullet from "./routes/Bullet";
import "./styles.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/enter" element={<Enter/>} />
        <Route element={<ProtectedRoute/>}>
          <Route path="/" element={<Home/>} />
          <Route path="/express" element={<Express/>} />
          <Route path="/taxi" element={<Taxi/>} />
          <Route path="/quick" element={<Quick/>} />
          <Route path="/bullet" element={<Bullet/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
