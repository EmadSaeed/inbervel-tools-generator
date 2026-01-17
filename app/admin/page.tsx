"use client";

import "./admin-dashboard.css";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

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
    companyName?: string | null;
    submissions: SubmissionRow[];
    required: RequiredRow[];
    readyToGenerate: boolean;
};

function formatDateDDMMYYYY(value: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

export default function AdminPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    const [email, setEmail] = useState("");
    const [data, setData] = useState<AdminSubmissionsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/admin/login");
        }
    }, [status, router]);

    const submissionByFormId = useMemo(() => {
        const map = new Map<string, SubmissionRow>();

        for (const s of data?.submissions ?? []) {
            const existing = map.get(s.formId);

            if (!existing) {
                map.set(s.formId, s);
                continue;
            }

            if (new Date(s.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
                map.set(s.formId, s);
            }
        }

        return map;
    }, [data?.submissions]);

    async function search() {
        if (loading || generating) return;

        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/submissions?email=${encodeURIComponent(email)}`
            );

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
        if (!data?.readyToGenerate || generating) return;

        setGenerating(true);
        try {
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
            const company = (data.companyName ?? "Company").trim();

            // Sanitise for filenames (Windows/macOS safe)
            const safeCompany = company.replace(/[\/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim();

            a.download = `${safeCompany} Business Plan.pdf`;

            a.click();

            setTimeout(() => URL.revokeObjectURL(url), 30_000);
        } finally {
            setGenerating(false);
        }
    }

    if (status === "loading") return null;
    if (status === "unauthenticated") return null;

    return (
        <div className="shell">
            {/* LEFT PANEL */}
            <aside className="left">
                <div className="brandRow">
                    <Image
                        src="/Inbervel-logo.png"
                        alt="Inbervel Logo"
                        width={160}
                        height={100}
                        className="logoImg"
                        priority
                    />
                    <div className="tagline">Profit-Pilot Business Plan Generator</div>
                </div>

                <div className="loginBar">
                    <div className="loginText">
                        Logged in as <strong>{session?.user?.email ?? "—"}</strong>
                    </div>

                    <button
                        className="ghostBtn"
                        onClick={() => signOut({ callbackUrl: "/admin/login" })}
                        disabled={loading || generating}
                    >
                        Sign out
                    </button>
                </div>
            </aside>

            {/* RIGHT PANEL */}
            <main className="right">
                <div className="content">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Client e-mail"
                        className="input"
                        disabled={loading || generating}
                    />

                    <button
                        onClick={search}
                        disabled={!email.trim() || loading || generating}
                        className="primaryBtn"
                    >
                        {loading ? "Searching..." : "Search for a client"}
                    </button>

                    {data?.companyName && (
                        <div className="companyLine">
                            <strong>Company Name:</strong> {data.companyName}
                        </div>
                    )}

                    {data && (
                        <>
                            <div className="tableWrap">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Form</th>
                                            <th className="dateCol">Date Submitted</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {data.required.map((r) => {
                                            const submission = submissionByFormId.get(r.formId);
                                            const submittedDate = formatDateDDMMYYYY(
                                                submission?.entryUpdatedAt ?? null
                                            );

                                            return (
                                                <tr key={r.formId}>
                                                    <td>
                                                        <span className="statusIcon">{r.present ? "✅" : "❌"}</span>
                                                        {r.title}
                                                    </td>
                                                    <td className="dateCol">{r.present ? submittedDate : ""}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={generatePdf}
                                disabled={!data.readyToGenerate || loading || generating}
                                className="generateBtn"
                            >
                                {generating ? (
                                    <>
                                        <span className="spinner" />
                                        Generating...
                                    </>
                                ) : (
                                    "Generate Business Plan PDF"
                                )}
                            </button>


                            {!data.readyToGenerate && (
                                <p className="hint">
                                    PDF generation is disabled until all required forms are present.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
