"use client";

import { useState } from "react";
import { REQUIRED_FORMS } from "@/lib/forms/requiredForms";

type SubmissionRow = {
  formId: string;
  formTitle: string | null;
  entryUpdatedAt: string | null;
  updatedAt: string;
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        alert(await res.text());
        return;
      }
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    } finally {
      setLoading(false);
    }
  }

  const hasForm = (formId: string) => submissions.some((s) => s.formId === formId);
  const allRequiredSubmitted = REQUIRED_FORMS.every((f) => hasForm(f.formId));

  async function generatePdf() {
    const res = await fetch("/api/admin/generate-business-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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
        <button onClick={search} disabled={!email || loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <h2 style={{ marginTop: 24 }}>Required forms</h2>
      <ul>
        {REQUIRED_FORMS.map((f) => (
          <li key={f.formId}>
            {hasForm(f.formId) ? "✅" : "❌"} {f.title} (Form ID: {f.formId})
          </li>
        ))}
      </ul>

      <button onClick={generatePdf} disabled={!allRequiredSubmitted || !email}>
        Generate Business Plan PDF
      </button>

      <h2 style={{ marginTop: 24 }}>Forms found</h2>
      <ul>
        {submissions.map((s) => (
          <li key={s.formId}>
            {s.formTitle ?? "(no title)"} — Form ID {s.formId}
          </li>
        ))}
      </ul>
    </main>
  );
}
