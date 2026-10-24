import { MultiAgentAssessmentClient } from "@/components/multi-agent/MultiAgentAssessmentClient";
import { TaskHubAssessmentVoiceContext } from "@/components/multi-agent/TaskHubAssessmentVoiceContext";

export const metadata = {
  title: "Task Hub · Multi-Agent Assessment",
  description:
    "Claude multi-agent form assessment: concierge, investigator, administrator, and grading committee.",
};

export default function MultiAgentAssessmentPage() {
  return (
    <TaskHubAssessmentVoiceContext>
      <MultiAgentAssessmentClient />
    </TaskHubAssessmentVoiceContext>
  );
}
