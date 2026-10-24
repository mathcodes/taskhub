import { getAppBaseUrl } from "@/lib/env";

export type NotifyWorkerParams = {
  displayName: string;
  playbookTitle: string;
  accessToken: string;
  email?: string | null;
  phone?: string | null;
};

export type ChannelResult = { channel: "email" | "sms"; ok: boolean; detail?: string };

/**
 * Sends email (Resend) and/or SMS (Twilio) when env is configured.
 * If neither is configured, returns skipped results (assignment still succeeds).
 */
export async function notifyWorkerAssignment(p: NotifyWorkerParams): Promise<ChannelResult[]> {
  const base = getAppBaseUrl();
  const path = `/playbooks/r/${p.accessToken}`;
  const url = `${base}${path}`;
  const results: ChannelResult[] = [];

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "Task Hub <onboarding@resend.dev>";

  if (p.email?.trim() && resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [p.email.trim()],
          subject: `Task assigned: ${p.playbookTitle}`,
          html: `<p>Hi ${escapeHtml(p.displayName)},</p>
<p>You have a new playbook run: <strong>${escapeHtml(p.playbookTitle)}</strong>.</p>
<p><a href="${url}">Open your checklist in Task Hub</a></p>
<p>If the link does not work, copy and paste:<br/><code>${escapeHtml(url)}</code></p>`,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        results.push({ channel: "email", ok: false, detail: t.slice(0, 200) });
      } else {
        results.push({ channel: "email", ok: true });
      }
    } catch (e) {
      results.push({
        channel: "email",
        ok: false,
        detail: e instanceof Error ? e.message : "send failed",
      });
    }
  } else if (p.email?.trim() && !resendKey) {
    results.push({ channel: "email", ok: false, detail: "RESEND_API_KEY not set" });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNum = process.env.TWILIO_FROM_NUMBER?.trim();

  if (p.phone?.trim() && sid && token && fromNum) {
    const body = `Task Hub: Hi ${p.displayName} — new checklist "${p.playbookTitle}". Open: ${url}`;
    try {
      const params = new URLSearchParams({
        To: normalizeE164(p.phone),
        From: fromNum,
        Body: body.slice(0, 1500),
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );
      if (!res.ok) {
        const t = await res.text();
        results.push({ channel: "sms", ok: false, detail: t.slice(0, 200) });
      } else {
        results.push({ channel: "sms", ok: true });
      }
    } catch (e) {
      results.push({
        channel: "sms",
        ok: false,
        detail: e instanceof Error ? e.message : "send failed",
      });
    }
  } else if (p.phone?.trim() && (!sid || !token || !fromNum)) {
    results.push({
      channel: "sms",
      ok: false,
      detail: "Twilio env incomplete (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)",
    });
  }

  return results;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Best-effort E.164: if missing +, assume US 10-digit */
function normalizeE164(phone: string): string {
  const t = phone.trim();
  if (t.startsWith("+")) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return t.startsWith("+") ? t : `+${digits}`;
}
