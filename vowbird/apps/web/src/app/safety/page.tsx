"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

function SafetyForm() {
  const params = useSearchParams();
  const [reportUserId, setReportUserId] = useState(params.get("reportUser") || "");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [blockUserId, setBlockUserId] = useState("");
  const [msg, setMsg] = useState("");

  async function submitReport(e: FormEvent) {
    e.preventDefault();
    await api("/reports", {
      method: "POST",
      body: JSON.stringify({ reportedUserId: reportUserId, reason, details }),
    });
    setMsg("Report submitted. Our team will review it.");
  }

  async function submitBlock(e: FormEvent) {
    e.preventDefault();
    await api("/blocks", {
      method: "POST",
      body: JSON.stringify({ blockedUserId: blockUserId, reason: details }),
    });
    setMsg("User blocked. You will not be matched again.");
  }

  return (
    <div className="space-y-8">
      {msg && <p className="text-sm text-sage">{msg}</p>}

      <form onSubmit={submitReport} className="card space-y-4">
        <h2 className="font-semibold">Report a user or content</h2>
        <input className="input" placeholder="Reported user ID" value={reportUserId} onChange={(e) => setReportUserId(e.target.value)} />
        <input className="input" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
        <textarea className="input" placeholder="Details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} />
        <button type="submit" className="btn-primary w-full">Submit report</button>
      </form>

      <form onSubmit={submitBlock} className="card space-y-4">
        <h2 className="font-semibold">Block a user</h2>
        <input className="input" placeholder="User ID to block" value={blockUserId} onChange={(e) => setBlockUserId(e.target.value)} required />
        <button type="submit" className="btn-secondary w-full">Block user</button>
      </form>

      <div className="card bg-sage/10">
        <h2 className="font-semibold">Safety in Veiled Mode</h2>
        <p className="mt-2 text-sm text-navy/70">
          Phone numbers, emails, social handles, and addresses are blocked in messages.
          You can report, block, end matches, and request rematches anytime.
        </p>
      </div>
    </div>
  );
}

export default function SafetyPage() {
  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Safety</h1>
        <Suspense><SafetyForm /></Suspense>
      </main>
    </RequireAuth>
  );
}
