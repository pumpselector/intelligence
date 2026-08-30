"use client";

import { useState } from "react";

type Status = { type: "error" | "info"; text: string } | null;

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 1000;

export default function ContactSection() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const ready =
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    subject.length <= SUBJECT_MAX &&
    message.length <= MESSAGE_MAX;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setPending(true);
    setStatus(null);

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });

    setPending(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setStatus({ type: "error", text: body?.error || "Could not send your message. Try again." });
      return;
    }

    setSubject("");
    setMessage("");
    setStatus({ type: "info", text: "Message sent, we'll get back to you soon." });
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contact us</h2>

      <form onSubmit={handleSubmit} className="mt-4 flex max-w-lg flex-col gap-3">
        <div>
          <label
            htmlFor="contact-subject"
            className="text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Subject
          </label>
          <input
            id="contact-subject"
            type="text"
            required
            maxLength={SUBJECT_MAX}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {subject.length}/{SUBJECT_MAX}
          </p>
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Message
          </label>
          <textarea
            id="contact-message"
            required
            rows={5}
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {message.length}/{MESSAGE_MAX}
          </p>
        </div>

        {status && (
          <p
            className={`rounded-md px-3 py-2 text-sm ${
              status.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {status.text}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !ready}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:self-start sm:px-6"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
      </form>
    </section>
  );
}
