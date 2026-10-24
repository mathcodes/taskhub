import { PitchCoachClient } from "@/app/pitch-coach/pitch-coach-client";

export const metadata = {
  title: "Pitch Coach · Task Hub",
  description: "Compare a performance with an expected score and get note-level pitch feedback.",
};

export default function PitchCoachPage() {
  return <PitchCoachClient />;
}