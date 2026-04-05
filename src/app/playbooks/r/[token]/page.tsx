import { PlaybookRunClient } from "@/app/playbooks/r/[token]/playbook-run-client";

export const metadata = {
  title: "Playbook run",
  description: "Complete your assigned checklist.",
};

export default async function PlaybookRunPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PlaybookRunClient token={token} />;
}
