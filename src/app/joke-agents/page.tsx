import { JokeAgentsClient } from "@/components/joke-agents/JokeAgentsClient";
import { JokeAgentsVoiceContext } from "@/components/joke-agents/JokeAgentsVoiceContext";

export const metadata = {
  title: "Three joke agents",
  description:
    "Three AI comedians—traditionalist, clown, funniest on earth—each riff on your phrase.",
};

export default function JokeAgentsPage() {
  return (
    <JokeAgentsVoiceContext>
      <JokeAgentsClient />
    </JokeAgentsVoiceContext>
  );
}
