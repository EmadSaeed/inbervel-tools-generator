"use client";

import { sampleBusinessPlanData } from "@/lib/sample-data/businessPlan";

export default function Home() {
  async function generateBusinessPlanPdf() {
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleBusinessPlanData),
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>PDF Generator</h1>
      <button onClick={generateBusinessPlanPdf}>Generate Business Plan PDF</button>
    </main>
  );
}
