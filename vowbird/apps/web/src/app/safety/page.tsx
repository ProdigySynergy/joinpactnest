"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, Suspense } from "react";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

type ReportComment = { id: string; body: string; createdAt: string };
type OpenReport = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  comments: ReportComment[];
};

function SafetyForm() {
  const params = useSearchParams();
  const reportUserId = params.get("reportUser") || "";
  const blockUserIdParam = params.get("blockUser") || reportUserId;
  const nameHint = params.get("name") || "";

  const [reportUserIdHidden] = useState(reportUserId);
  const [blockUserId, setBlockUserId] = useState(blockUserIdParam);
  const [reportedDisplayName, setReportedDisplayName] = useState(nameHint);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [openReport, setOpenReport] = useState<OpenReport | null>(null);
  const [maxFollowUps, setMaxFollowUps] = useState(2);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [blockSubmitted, setBlockSubmitted] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lookupId = reportUserIdHidden || blockUserIdParam;
    if (!lookupId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{
          reportedUser: { id: string; displayName: string };
          report: OpenReport | null;
          maxFollowUps: number;
        }>(`/reports/open?reportedUserId=${encodeURIComponent(lookupId)}`);
        if (cancelled) return;
        setReportedDisplayName(data.reportedUser.displayName);
        setMaxFollowUps(data.maxFollowUps);
        if (reportUserIdHidden && data.report) {
          setOpenReport(data.report);
          setReportSubmitted(true);
        }
      } catch {
        // keep name hint if lookup fails
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportUserIdHidden, blockUserIdParam]);

  async function submitReport(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ report: OpenReport; maxFollowUps: number }>("/reports", {
        method: "POST",
        body: JSON.stringify({
          reportedUserId: reportUserIdHidden || undefined,
          reason,
          details: details || undefined,
        }),
      });
      setOpenReport(data.report);
      setMaxFollowUps(data.maxFollowUps);
      setReportSubmitted(true);
      setMsg("Report submitted. Our team will review it.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit report";
      if (message.includes("already have an open report")) {
        setReportSubmitted(true);
        setMsg(message);
        try {
          const data = await api<{
            report: OpenReport | null;
            maxFollowUps: number;
          }>(`/reports/open?reportedUserId=${encodeURIComponent(reportUserIdHidden)}`);
          if (data.report) setOpenReport(data.report);
          setMaxFollowUps(data.maxFollowUps);
        } catch {
          /* ignore */
        }
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitFollowUp(e: FormEvent) {
    e.preventDefault();
    if (!openReport) return;
    setError("");
    setLoading(true);
    try {
      const data = await api<{ report: OpenReport; maxFollowUps: number }>(
        `/reports/${openReport.id}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ body: followUp }),
        }
      );
      setOpenReport(data.report);
      setMaxFollowUps(data.maxFollowUps);
      setFollowUp("");
      setMsg("Follow-up added to your report.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add follow-up");
    } finally {
      setLoading(false);
    }
  }

  async function submitBlock(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/blocks", {
        method: "POST",
        body: JSON.stringify({
          blockedUserId: blockUserId,
          reason: details || undefined,
        }),
      });
      setBlockSubmitted(true);
      setMsg("User blocked. You will not be matched again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not block user");
    } finally {
      setLoading(false);
    }
  }

  const followUpsLeft = openReport
    ? Math.max(0, maxFollowUps - openReport.comments.length)
    : maxFollowUps;

  return (
    <div className="space-y-8">
      {msg && <p className="text-sm text-sage">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {reportSubmitted && openReport ? (
        <div className="card space-y-4 border-red-200 bg-red-50/40">
          <h2 className="font-semibold text-red-800">Report received</h2>
          {reportedDisplayName && (
            <p className="text-sm text-navy/70">
              About: <span className="font-medium text-navy">{reportedDisplayName}</span>
            </p>
          )}
          <p className="text-sm text-navy/80">
            <span className="font-medium">Reason:</span> {openReport.reason}
          </p>
          {openReport.details && (
            <p className="text-sm text-navy/70 whitespace-pre-wrap">{openReport.details}</p>
          )}
          {openReport.comments.length > 0 && (
            <div className="space-y-2 border-t border-navy/10 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Follow-ups</p>
              {openReport.comments.map((c) => (
                <p key={c.id} className="rounded-lg bg-white/80 p-3 text-sm text-navy/80">
                  {c.body}
                </p>
              ))}
            </div>
          )}
          {followUpsLeft > 0 ? (
            <form onSubmit={submitFollowUp} className="space-y-3 border-t border-navy/10 pt-4">
              <p className="text-sm text-navy/70">
                Add more detail while you wait ({followUpsLeft} left).
              </p>
              <textarea
                className="input"
                placeholder="Additional details"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                rows={3}
                required
                minLength={3}
              />
              <button type="submit" className="btn-danger w-full" disabled={loading}>
                {loading ? "Sending..." : "Add follow-up"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-navy/60">
              You&apos;ve used all follow-ups. Our team will review and get back to you.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submitReport} className="card space-y-4">
          <h2 className="font-semibold">Report a user</h2>
          {reportUserIdHidden ? (
            <>
              <input type="hidden" name="reportedUserId" value={reportUserIdHidden} />
              <div className="rounded-xl border border-navy/10 bg-navy/5 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-navy/50">Reporting</p>
                <p className="font-medium">{reportedDisplayName || "Selected partner"}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-navy/60">
              Open Report from a match or partner page to report a specific person.
            </p>
          )}
          <input
            className="input"
            placeholder="Reason (e.g. harassment, spam)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={3}
            disabled={!reportUserIdHidden}
          />
          <textarea
            className="input"
            placeholder="Details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            disabled={!reportUserIdHidden}
          />
          <button
            type="submit"
            className="btn-danger w-full"
            disabled={loading || !reportUserIdHidden}
          >
            {loading ? "Submitting..." : "Submit report"}
          </button>
        </form>
      )}

      {blockSubmitted ? (
        <div className="card space-y-2 border-red-200 bg-red-50/40">
          <h2 className="font-semibold text-red-800">User blocked</h2>
          <p className="text-sm text-navy/70">
            You will not be matched with this person again. Existing matches were ended.
          </p>
        </div>
      ) : (
        <form onSubmit={submitBlock} className="card space-y-4 border-red-200/60">
          <h2 className="font-semibold text-red-800">Block a user</h2>
          <p className="text-sm text-navy/60">
            Blocking ends active matches and prevents future pairing.
          </p>
          {blockUserIdParam && reportedDisplayName ? (
            <>
              <input type="hidden" name="blockedUserId" value={blockUserId} />
              <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-red-700/70">Blocking</p>
                <p className="font-medium text-red-900">{reportedDisplayName}</p>
              </div>
            </>
          ) : (
            <input
              className="input"
              placeholder="Paste user ID only if support asked you to"
              value={blockUserId}
              onChange={(e) => setBlockUserId(e.target.value)}
              required
            />
          )}
          <button type="submit" className="btn-danger w-full" disabled={loading || !blockUserId}>
            {loading ? "Blocking..." : "Block user"}
          </button>
        </form>
      )}

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
