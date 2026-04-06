import { CorpusBuilderClient } from "@/app/corpus-builder/corpus-builder-client";

export const metadata = {
  title: "Corpus builder · Task Hub",
  description:
    "Upload documents and URLs; agents extract text and produce training-ready Markdown and a reference index.",
};

export default function CorpusBuilderPage() {
  return <CorpusBuilderClient />;
}
