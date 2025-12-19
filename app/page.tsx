"use client";

export default function Home() {
  async function generatePdf() {
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceNumber: "INV-1001",
        invoiceDate: "19 December 2025",
        customer: { name: "Acme Ltd", email: "accounts@acme.com" },
        items: [{ description: "Consulting", qty: 2, lineTotal: "£1,000.00" }],
        total: "£1,000.00",
      }),
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
      <button onClick={generatePdf}>Generate Invoice PDFs Test khszhcknxkzxckks</button>
    </main>
  );
}
