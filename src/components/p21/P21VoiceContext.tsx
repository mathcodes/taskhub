"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";

export function P21VoiceContext({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();

  useEffect(() => {
    setVoicePageContext({
      pathname: pathname || "/p21",
      viewLabel: "P21 SQL Query Master",
      summary:
        "Natural language to T-SQL for Epicor Prophet 21. The question box uses schema retrieved from docs/p21/training/sql_p21_db.csv; NL→SQL and review agents run; SQL is not executed here. User can dictate into the question field with the purple Dictate button.",
    });
    return () => setVoicePageContext(null);
  }, [pathname, setVoicePageContext]);

  return <>{children}</>;
}
