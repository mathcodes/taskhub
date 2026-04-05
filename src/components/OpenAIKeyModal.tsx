"use client";

import { useEffect, useId, useState } from "react";
import { useUserOpenAIKey } from "@/components/UserOpenAIKeyProvider";

/**
 * Public BYOK copy (also shown in the modal). Reuse for marketing or onboarding; adjust for your product / privacy policy.
 */
export const OPENAI_KEY_PUBLIC_COPY = {
  title: "Your OpenAI API key",
  body: `Voice chat and AI agents call OpenAI’s API. Add your own key so you control billing and usage through your OpenAI account.

Your key is saved only in this browser (local storage on your device). It is not stored on our servers. When you use an AI feature, the key is sent to this app over HTTPS so our server can forward the request to OpenAI—we do not use it to train models.

If this deployment also sets a server key, that key may be used when you have not added your own.`,
  getKeyLabel: "Create or manage keys",
  getKeyHref: "https://platform.openai.com/api-keys",
} as const;

const COPY = OPENAI_KEY_PUBLIC_COPY;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OpenAIKeyModal({ open, onClose }: Props) {
  const { apiKey, setApiKey, clearApiKey, ready } = useUserOpenAIKey();
  const [draft, setDraft] = useState("");
  const inputId = useId();

  useEffect(() => {
    if (open && ready) setDraft(apiKey ?? "");
  }, [open, ready, apiKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="openai-key-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="openai-key-modal-title" className="text-lg font-semibold text-zinc-50">
          {COPY.title}
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-400">{COPY.body}</p>
        <a
          href={COPY.getKeyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm text-teal-400 hover:text-teal-300"
        >
          {COPY.getKeyLabel} →
        </a>

        <label htmlFor={inputId} className="mt-6 block text-xs font-medium uppercase text-zinc-500">
          API key
          <input
            id={inputId}
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100"
            placeholder="sk-…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
            onClick={() => {
              clearApiKey();
              setDraft("");
            }}
          >
            Remove key from this browser
          </button>
          <button
            type="button"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
            onClick={() => {
              setApiKey(draft);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function OpenAIKeyButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { apiKey, ready } = useUserOpenAIKey();

  useEffect(() => {
    setMounted(true);
  }, []);

  const showSaved = mounted && ready && !!apiKey;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          showSaved
            ? "border-teal-500/50 bg-teal-950/50 text-teal-200 hover:border-teal-400"
            : "border-zinc-600 bg-zinc-900/90 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        }`}
        title="OpenAI API key for AI features"
      >
        {showSaved ? "API key · saved" : "API key"}
      </button>
      <OpenAIKeyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
