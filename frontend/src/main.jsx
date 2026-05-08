import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

function App() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    if (!apiBaseUrl) {
      setStatus("missing VITE_API_BASE_URL");
      return;
    }

    fetch(`${apiBaseUrl}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => setStatus(data.status || "ok"))
      .catch((error) => setStatus(error.message));
  }, []);

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Google Cloud Run starter</p>
        <h1>React frontend + Python backend</h1>
        <dl>
          <div>
            <dt>API URL</dt>
            <dd>{apiBaseUrl || "not configured"}</dd>
          </div>
          <div>
            <dt>Backend health</dt>
            <dd>{status}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

