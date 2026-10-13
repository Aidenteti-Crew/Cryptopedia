export interface QueryResult<Row = Record<string, unknown>> {
  rows: Row[]
  rowCount: number | null
}

export type QueryFn = (sql: string, params: unknown[]) => Promise<QueryResult>
