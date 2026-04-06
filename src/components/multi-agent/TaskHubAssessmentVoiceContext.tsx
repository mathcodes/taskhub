"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";

export function TaskHubAssessmentVoiceContext({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();

  useEffect(() => {
    setVoicePageContext({
      pathname: pathname || "/taskhub/multi-agent-assessment",
      viewLabel: "Task Hub · Multi-Agent Assessment",
      summary:
        "Demo form reviewed by Claude agents: Concierge, Investigator, Administrator, then a grading committee. Requires server ANTHROPIC_API_KEY. User submits the assessment form and reads logs and final report.",
    });
    return () => setVoicePageContext(null);
  }, [pathname, setVoicePageContext]);

  return <>{children}</>;
}
