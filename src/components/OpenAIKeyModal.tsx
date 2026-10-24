"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useUserOpenAIKey } from "@/components/UserOpenAIKeyProvider";

/**
 * Public BYOK copy (also shown in the modal).
 */
export const OPENAI_KEY_PUBLIC_COPY = {
  title: "Your API keys",
  body: `This public demo runs on your own AI accounts, so you control billing and usage.

Keys are saved only in this browser (local storage on your device), never on our servers. When you use an AI feature, the key is sent over HTTPS to this app's server, which forwards your request to the provider and discards the key.`,
} as const;

const COPY = OPENAI_KEY_PUBLIC_COPY;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OpenAIKeyModal({ open, onClose }: Props) {
  const { apiKey, anthropicKey, setApiKey, setAnthropicKey, ready } = useUserOpenAIKey();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openaiDraft, setOpenaiDraft] = useState("");
  const [anthropicDraft, setAnthropicDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const openaiId = useId();
  const anthropicId = useId();
  const errorId = useId();

  // Native <dialog> gives a focus trap, Escape to close, and inert background.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !ready) return;
    const id = window.setTimeout(() => {
      setOpenaiDraft(apiKey ?? "");
      setAnthropicDraft(anthropicKey ?? "");
      setError(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, ready, apiKey, anthropicKey]);

  function save() {
    const a = anthropicDraft.trim();
    const o = openaiDraft.trim();
    if (a && !a.startsWith("sk-ant-")) {
      setError("Anthropic keys start with sk-ant-.");
      return;
    }
    if (o && !o.startsWith("sk-")) {
      setError("OpenAI keys start with sk-.");
      return;
    }
    setApiKey(o);
    setAnthropicKey(a);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="api-key-modal-title"
      aria-describedby="api-key-modal-desc"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-auto max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-6 text-zinc-100 shadow-2xl backdrop:bg-black/70"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h2 id="api-key-modal-title" className="text-lg font-semibold text-zinc-50">
          {COPY.title}
        </h2>
        <p id="api-key-modal-desc" className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
          {COPY.body}
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor={anthropicId} className="block text-sm font-medium text-zinc-200">
              Anthropic (Claude) key
            </label>
            <p className="mt-0.5 text-xs text-zinc-400">
              Used by Pitch Coach feedback and Multi-Agent Assessment.{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-300 underline hover:text-teal-200"
              >
                Get a key<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
            <input
              id={anthropicId}
              type="password"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={error ? errorId : undefined}
              className="mt-2 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500"
              placeholder="sk-ant-…"
              value={anthropicDraft}
              onChange={(e) => setAnthropicDraft(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor={openaiId} className="block text-sm font-medium text-zinc-200">
              OpenAI key
            </label>
            <p className="mt-0.5 text-xs text-zinc-400">
              Used by the voice assistant, Task Hub agents, joke agents, playbooks, and SQL tools.{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-300 underline hover:text-teal-200"
              >
                Get a key<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
            <input
              id={openaiId}
              type="password"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={error ? errorId : undefined}
              className="mt-2 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500"
              placeholder="sk-…"
              value={openaiDraft}
              onChange={(e) => setOpenaiDraft(e.target.value)}
            />
          </div>
        </div>

        <p id={errorId} role="alert" className="mt-3 min-h-5 text-sm text-rose-300">
          {error}
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="min-h-10 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            onClick={() => {
              setApiKey("");
              setAnthropicKey("");
              setOpenaiDraft("");
              setAnthropicDraft("");
            }}
          >
            Remove keys from this browser
          </button>
          <button
            type="button"
            className="min-h-10 rounded-lg px-4 py-2 text-sm text-zinc-200 hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-10 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function OpenAIKeyButton() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { apiKey, anthropicKey, ready } = useUserOpenAIKey();

  const count = ready ? Number(!!apiKey) + Number(!!anthropicKey) : 0;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          count
            ? "border-teal-500/60 bg-teal-950/60 text-teal-100 hover:border-teal-400"
            : "border-zinc-500 bg-zinc-900/90 text-zinc-200 hover:border-zinc-400 hover:text-white"
        }`}
      >
        {count ? `API keys · ${count} saved` : "Add API keys"}
      </button>
      <OpenAIKeyModal
        open={open}
        onClose={() => {
          setOpen(false);
          buttonRef.current?.focus();
        }}
      />
    </>
  );
}
