import { join } from "path";

export function corpusBuilderRoot(): string {
  return join(process.cwd(), ".data", "corpus-builder");
}

export function uploadDirForRun(runId: string): string {
  return join(corpusBuilderRoot(), "uploads", runId);
}

export function outputDirForRun(runId: string): string {
  return join(corpusBuilderRoot(), "outputs", runId);
}
