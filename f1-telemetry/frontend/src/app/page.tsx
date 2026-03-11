"use client";
import { useState } from "react";

export default function Dashboard() {
  const [status, setStatus] = useState("F1 Telemetry Dashboard - Live!");
  
  return (
    <div style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#FF8000", fontFamily: "monospace" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏎️ F1 TELEMETRY</h1>
        <p style={{ color: "#888" }}>Dashboard is deploying successfully!</p>
        <p style={{ color: "#444", marginTop: "1rem" }}>Backend: https://f1-telemetry-backend-37eq.onrender.com</p>
      </div>
    </div>
  );
}