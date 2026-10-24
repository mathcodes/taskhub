import { SqlQueryClient } from "@/app/sql-query/sql-query-client";

export const metadata = {
  title: "SQL Query · TaskHub",
  description: "Generate reviewed, read-only SQL from a plain-language request and optional schema context.",
};

export default function SqlQueryPage() {
  return <SqlQueryClient />;
}