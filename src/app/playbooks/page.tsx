import { PlaybooksClient } from "@/app/playbooks/playbooks-client";

export const metadata = {
  title: "Department playbooks",
  description: "Upload playbooks, assign workers, track checklist progress.",
};

export default function PlaybooksPage() {
  return <PlaybooksClient />;
}
