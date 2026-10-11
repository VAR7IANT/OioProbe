import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Router } from "./nav";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
