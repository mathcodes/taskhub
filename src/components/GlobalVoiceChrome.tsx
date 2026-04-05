"use client";

import { VoiceChromePanel, VoiceChromeToolbar } from "@/components/VoiceAssistantProvider";

/** Sticky voice + API key bar available on every page. */
export function GlobalVoiceChrome() {
  return (
    <div className="sticky top-0 z-40 border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3 px-4 py-3">
        <VoiceChromeToolbar />
      </div>
      <div className="mx-auto max-w-5xl px-4">
        <VoiceChromePanel />
      </div>
    </div>
  );
}
