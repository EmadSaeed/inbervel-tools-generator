"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AdminLogin() {
    const [email, setEmail] = useState("");

    async function onSubmit() {
        await signIn("email", {
            email,
            callbackUrl: "/admin",
        });
    }

    return (
        <main style={{ padding: 24 }}>
            <h1>Admin Login</h1>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Assigned email only"
                style={{ padding: 8, width: 320 }}
            />
            <button onClick={onSubmit} disabled={!email.trim()} style={{ marginLeft: 8 }}>
                Send sign-in link
            </button>
        </main>
    );
}
