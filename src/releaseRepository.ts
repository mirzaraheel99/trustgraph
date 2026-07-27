import type { DbSchemaMigrationRun } from "./database";
import { supabaseRest } from "./supabase";

export async function loadSchemaMigrationRuns(accessToken: string): Promise<DbSchemaMigrationRun[]> {
  return supabaseRest<DbSchemaMigrationRun[]>("schema_migration_runs?select=*&order=applied_at.desc&limit=12", {
    accessToken
  });
}
