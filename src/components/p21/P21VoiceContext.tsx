"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";

export function P21VoiceContext({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();

  useEffect(() => {
    const path = pathname || "/p21";
    const isBoss = path.startsWith("/p21/boss");
    setVoicePageContext({
      pathname: path,
      viewLabel: isBoss ? "P21 · BOSS business rules" : "P21 SQL Query Master",
      summary: isBoss
        ? "BOSS multi-agent pipeline: curated rule examples, T-SQL sketches from sql_p21_db.csv, markdown docs under docs/p21/training/boss/docs, then synthesis into an implementation spec. Nothing is written to P21 automatically."
        : "Natural language to T-SQL for Epicor Prophet 21. The question box uses schema retrieved from docs/p21/training/sql_p21_db.csv; NL→SQL and review agents run; SQL is not executed here. User can dictate into the question field with the purple Dictate button.",
    });
    return () => setVoicePageContext(null);
  }, [pathname, setVoicePageContext]);

  return <>{children}</>;
}
