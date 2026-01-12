"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  const isAuthed = !!session?.user?.email;

  return (
    <main style={{ padding: 24 }}>
      <h1>Welcome to Inbervel Profit-Pilot Admin Dashboard</h1>

      {status === "loading" && <p>Checking session…</p>}

      {status !== "loading" && !isAuthed && (
        <>
          <p>You are not logged in.</p>
          <button
            onClick={() => signIn("email", { callbackUrl: "/admin" })}
            style={{ marginTop: 12 }}
          >
            Sign in
          </button>
        </>
      )}

      {status !== "loading" && isAuthed && (
        <>
          <p>
            Logged in as <strong>{session.user?.email}</strong>
          </p>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <a href="/admin" style={{ textDecoration: "underline" }}>
              Go to Admin Dashboard
            </a>

            <button onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </button>
          </div>
        </>
      )}
    </main>
  );
}
