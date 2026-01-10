"use client";

import { useState } from "react";

type SubmissionRow = {
  formId: string;
  formTitle: string | null;
  entryUpdatedAt: string | null;
  updatedAt: string;
};

type RequiredRow = {
  formId: string;
  key: string;
  title: string;
  present: boolean;
};

type AdminSubmissionsResponse = {
  email: string;
  submissions: SubmissionRow[];
  required: RequiredRow[];
  readyToGenerate: boolean;
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [data, setData] = useState<AdminSubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        alert(await res.text());
        setData(null);
        return;
      }
      const json = (await res.json()) as AdminSubmissionsResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  async function generatePdf() {
    if (!data?.readyToGenerate) return;

    const res = await fetch("/api/admin/generate-business-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "business-plan.pdf";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin Dashboard</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="User email"
          style={{ padding: 8, width: 320 }}
        />
        <button onClick={search} disabled={!email.trim() || loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {data && (
        <>
          <h2 style={{ marginTop: 24 }}>Required forms</h2>
          <ul>
            {data.required.map((r) => (
              <li key={r.formId}>
                {r.present ? "✅" : "❌"} {r.title} (Form ID: {r.formId})
              </li>
            ))}
          </ul>

          <button
            onClick={generatePdf}
            disabled={!data.readyToGenerate || loading}
            style={{ marginTop: 8 }}
          >
            Generate Business Plan PDF
          </button>

          {!data.readyToGenerate && (
            <p style={{ marginTop: 8, opacity: 0.8 }}>
              PDF generation is disabled until all required forms are present.
            </p>
          )}

          <h2 style={{ marginTop: 24 }}>Forms found</h2>
          <ul>
            {data.submissions.map((s) => (
              <li key={`${s.formId}-${s.updatedAt}`}>
                {s.formTitle ?? "(no title)"} — Form ID {s.formId}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
