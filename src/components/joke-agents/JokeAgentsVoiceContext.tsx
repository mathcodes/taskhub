"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";

export function JokeAgentsVoiceContext({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();

  useEffect(() => {
    setVoicePageContext({
      pathname: pathname || "/joke-agents",
      viewLabel: "Three joke agents",
      summary:
        "Fun page: user enters three phrases; each of three OpenAI personas (traditionalist, clown, funniest on earth) writes one joke that must use all three phrases. Jokes play one at a time with optional speech. Requires OpenAI key (BYOK or server).",
    });
    return () => setVoicePageContext(null);
  }, [pathname, setVoicePageContext]);

  return <>{children}</>;
}
