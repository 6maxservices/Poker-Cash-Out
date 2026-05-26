import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (reg) => console.log("Service Worker registered successfully:", reg.scope),
      (err) => console.error("Service Worker registration failed:", err)
    );
  });
}

createRoot(document.getElementById("root")!).render(<App />);
