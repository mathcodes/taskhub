import { runDocsApplicationAgent } from "@/lib/p21/boss/agents/docsApplicationAgent";
import { runExamplesUnderstandingAgent } from "@/lib/p21/boss/agents/examplesUnderstandingAgent";
import { runSqlRuleAgent } from "@/lib/p21/boss/agents/sqlRuleAgent";
import { runSynthesisAgent } from "@/lib/p21/boss/agents/synthesisAgent";
import { retrieveBossDocs } from "@/lib/p21/boss/bossDocs";
import { retrieveBossExamples } from "@/lib/p21/boss/bossExamples";
import { loadBossCSharpTemplate } from "@/lib/p21/boss/bossTemplate";
import { retrieveRelevantSchema } from "@/lib/p21/schemaDictionary";

export type BossPipelineResult = {
  question: string;
  retrieval: {
    schema: { tables: string[]; dictionaryRowsUsed: number };
    examples: { ids: string[]; count: number };
    docs: { paths: string[]; count: number };
  };
  stages: {
    examples: Record<string, unknown>;
    sql: Record<string, unknown>;
    docs: Record<string, unknown>;
  };
  synthesis: Record<string, unknown>;
};

export async function runBossPipeline(params: {
  question: string;
  apiKey?: string;
}): Promise<BossPipelineResult> {
  const q = params.question.trim();
  const { markdown: schemaMd, tables, rowCount } = retrieveRelevantSchema(q, { maxTables: 12 });
  const ex = retrieveBossExamples(q, { max: 8 });
  const doc = retrieveBossDocs(q, { maxChunks: 8 });

  const examplesStage = await runExamplesUnderstandingAgent({
    userQuestion: q,
    examplesMarkdown: ex.markdown,
    apiKey: params.apiKey,
  });
  const examplesJson = JSON.stringify(examplesStage);

  const [sqlStage, docsStage] = await Promise.all([
    runSqlRuleAgent({
      userQuestion: q,
      examplesJson,
      schemaMarkdown: schemaMd,
      apiKey: params.apiKey,
    }),
    runDocsApplicationAgent({
      userQuestion: q,
      examplesJson,
      docsMarkdown: doc.markdown,
      apiKey: params.apiKey,
    }),
  ]);

  const csharpTemplate = loadBossCSharpTemplate();

  const synthesis = await runSynthesisAgent({
    userQuestion: q,
    examplesJson,
    sqlJson: JSON.stringify(sqlStage),
    docsJson: JSON.stringify(docsStage),
    csharpTemplate,
    apiKey: params.apiKey,
  });

  return {
    question: q,
    retrieval: {
      schema: { tables, dictionaryRowsUsed: rowCount },
      examples: { ids: ex.ids, count: ex.count },
      docs: { paths: doc.paths, count: doc.count },
    },
    stages: {
      examples: examplesStage,
      sql: sqlStage,
      docs: docsStage,
    },
    synthesis,
  };
}
