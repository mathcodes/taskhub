"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { VoiceChatTurn } from "@/lib/agents/voiceAssistantTurn";
import { getSpeechRecognitionCtor, type SpeechRecognitionLike } from "@/lib/speechRecognition";
import { OpenAIKeyButton } from "@/components/OpenAIKeyModal";
import { useOpenAIFetchHeaders } from "@/components/UserOpenAIKeyProvider";

export type VoicePageContext = {
  pathname: string;
  viewLabel: string;
  summary: string;
};

type Setter = (ctx: VoicePageContext | null) => void;

const VoicePageContextSetter = createContext<Setter | null>(null);

export function useVoicePageContext(): Setter {
  const s = useContext(VoicePageContextSetter);
  if (!s) {
    throw new Error("useVoicePageContext must be used within VoiceAssistantProvider");
  }
  return s;
}

type VoiceChromeCtx = {
  pageContext: VoicePageContext | null;
  messages: VoiceChatTurn[];
  setMessages: React.Dispatch<React.SetStateAction<VoiceChatTurn[]>>;
  micOn: boolean;
  listening: boolean;
  interim: string;
  panelOpen: boolean;
  busy: boolean;
  err: string | null;
  pathname: string;
  viewLabel: string;
  summary: string;
  micActive: boolean;
  toggleMic: () => void;
  dismissPanel: () => void;
  cancelListening: () => void;
};

const VoiceChromeContext = createContext<VoiceChromeCtx | null>(null);

function useVoiceChrome(): VoiceChromeCtx {
  const c = useContext(VoiceChromeContext);
  if (!c) throw new Error("Voice chrome must be used within VoiceAssistantProvider");
  return c;
}

export function VoiceChromeToolbar() {
  const {
    micOn,
    micActive,
    listening,
    toggleMic,
    panelOpen,
    dismissPanel,
  } = useVoiceChrome();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <OpenAIKeyButton />
      {panelOpen && (
        <button
          type="button"
          onClick={dismissPanel}
          className="rounded-full border border-zinc-600 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Hide panel
        </button>
      )}
      <button
        type="button"
        aria-pressed={micOn}
        aria-label={micOn ? "Turn voice assistant off" : "Turn voice assistant on"}
        onClick={() => toggleMic()}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 shadow-lg transition ${
          micActive
            ? "border-teal-400 bg-teal-600 text-white shadow-teal-900/40"
            : "border-zinc-600 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
        } ${listening ? "animate-pulse" : ""}`}
      >
        <MicIcon on={micActive} />
      </button>
    </div>
  );
}

export function VoiceChromePanel() {
  const {
    panelOpen,
    micOn,
    listening,
    busy,
    err,
    viewLabel,
    pathname,
    messages,
    interim,
    cancelListening,
  } = useVoiceChrome();

  if (!panelOpen) return null;

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Voice</p>
          <p className="text-sm text-zinc-300">
            {micOn
              ? listening
                ? "Listening — speak about this screen or your tasks. Tap the mic again to send."
                : busy
                  ? "Working…"
                  : "Starting…"
              : "Mic off — tap the mic to speak, tap again when you are done to send."}
          </p>
        </div>
        {micOn && (
          <button
            type="button"
            onClick={() => {
              cancelListening();
            }}
            className="shrink-0 text-xs text-zinc-500 hover:text-rose-300"
          >
            Cancel
          </button>
        )}
      </div>
      <p className="mb-1 text-[11px] text-zinc-600">
        {viewLabel} · <span className="font-mono">{pathname}</span>
      </p>
      {err && (
        <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {err}
        </div>
      )}
      <div className="max-h-[min(45vh,360px)] space-y-3 overflow-y-auto pr-1 text-sm">
        {messages.length === 0 && !interim && (
          <p className="text-zinc-500">
            Ask what&apos;s due today, add tasks by voice, or get help with the current screen.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}-${m.content.slice(0, 24)}`}
            className={`rounded-lg px-3 py-2 ${
              m.role === "user"
                ? "ml-4 bg-zinc-800/80 text-zinc-100"
                : "mr-4 border border-zinc-800 bg-zinc-900/60 text-zinc-200"
            }`}
          >
            <span className="text-[10px] uppercase text-zinc-500">
              {m.role === "user" ? "You" : "Assistant"}
            </span>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.content}</p>
          </div>
        ))}
        {interim ? (
          <p className="ml-4 rounded-lg bg-zinc-800/40 px-3 py-2 italic text-zinc-400">{interim}</p>
        ) : null}
        {busy && <p className="text-xs text-zinc-500">Contacting model…</p>}
      </div>
    </div>
  );
}

function MicIcon({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM11 19h2v3h-2v-3z"
        fill="currentColor"
        opacity={on ? 1 : 0.85}
      />
    </svg>
  );
}

function VoiceChromeController({
  pageContext,
  messages,
  setMessages,
  children,
}: {
  pageContext: VoicePageContext | null;
  messages: VoiceChatTurn[];
  setMessages: React.Dispatch<React.SetStateAction<VoiceChatTurn[]>>;
  children: React.ReactNode;
}) {
  const pathnameFromRoute = usePathname();
  const getAIHeaders = useOpenAIFetchHeaders();
  const [micOn, setMicOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalBufRef = useRef("");
  const cancelledRef = useRef(false);
  const micOnRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => {});

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  const pathname = pageContext?.pathname ?? pathnameFromRoute ?? "/";
  const viewLabel = pageContext?.viewLabel ?? "Page";
  const summary = pageContext?.summary ?? "No page summary registered yet.";

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  const sendTranscript = useCallback(
    async (text: string) => {
      setBusy(true);
      setErr(null);
      try {
        const userMsg: VoiceChatTurn = { role: "user", content: text };
        const res = await fetch("/api/voice/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAIHeaders(),
          },
          body: JSON.stringify({
            transcript: text,
            pathname,
            viewLabel,
            pageSummary: summary,
            priorMessages: messages,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Voice request failed");
        const assistantMsg: VoiceChatTurn = { role: "assistant", content: data.reply as string };
        setMessages((m) => [...m, userMsg, assistantMsg]);
        if (typeof data.createdTaskCount === "number" && data.createdTaskCount > 0) {
          window.dispatchEvent(new CustomEvent("taskhub:refresh"));
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Voice request failed");
      } finally {
        setBusy(false);
        if (micOnRef.current) {
          startListeningRef.current();
        }
      }
    },
    [messages, pathname, summary, viewLabel, setMessages, getAIHeaders]
  );

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setErr("Voice input is not supported in this browser. Try Chrome, Edge, or Safari.");
      return;
    }
    cancelledRef.current = false;
    finalBufRef.current = "";
    setInterim("");
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = typeof navigator !== "undefined" ? navigator.language : "en-US";
    r.onresult = (ev) => {
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const t = res[0]?.transcript ?? "";
        if (res.isFinal) finalBufRef.current += t;
        else interimText += t;
      }
      setInterim(interimText);
    };
    r.onerror = (ev) => {
      setErr(`Speech recognition: ${ev.error}`);
      setListening(false);
      recRef.current = null;
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
      recRef.current = null;
      const cancelled = cancelledRef.current;
      cancelledRef.current = false;
      const text = finalBufRef.current.trim();
      if (!cancelled && text) void sendTranscript(text);
    };
    recRef.current = r;
    setListening(true);
    try {
      r.start();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start microphone");
      setListening(false);
      recRef.current = null;
    }
  }, [sendTranscript]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const cancelListening = useCallback(() => {
    cancelledRef.current = true;
    recRef.current?.abort();
    setMicOn(false);
  }, []);

  const toggleMic = useCallback(() => {
    setErr(null);
    if (micOn) {
      setMicOn(false);
      stopListening();
      return;
    }
    setMicOn(true);
    setPanelOpen(true);
    startListening();
  }, [micOn, startListening, stopListening]);

  const dismissPanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const micActive = micOn || listening || busy;

  const voiceCtx = useMemo<VoiceChromeCtx>(
    () => ({
      pageContext,
      messages,
      setMessages,
      micOn,
      listening,
      interim,
      panelOpen,
      busy,
      err,
      pathname,
      viewLabel,
      summary,
      micActive,
      toggleMic,
      dismissPanel,
      cancelListening,
    }),
    [
      pageContext,
      messages,
      setMessages,
      micOn,
      listening,
      interim,
      panelOpen,
      busy,
      err,
      pathname,
      viewLabel,
      summary,
      micActive,
      toggleMic,
      dismissPanel,
      cancelListening,
    ]
  );

  return (
    <VoiceChromeContext.Provider value={voiceCtx}>{children}</VoiceChromeContext.Provider>
  );
}

export function VoiceAssistantProvider({ children }: { children: React.ReactNode }) {
  const [pageContext, setPageContext] = useState<VoicePageContext | null>(null);
  const [messages, setMessages] = useState<VoiceChatTurn[]>([]);

  const setter = useMemo<Setter>(() => (ctx) => setPageContext(ctx), []);

  return (
    <VoicePageContextSetter.Provider value={setter}>
      <VoiceChromeController pageContext={pageContext} messages={messages} setMessages={setMessages}>
        {children}
      </VoiceChromeController>
    </VoicePageContextSetter.Provider>
  );
}
