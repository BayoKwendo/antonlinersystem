// =============================================================================
//  Audit trail. Records who did what; best-effort (never breaks the request).
// =============================================================================
import client from "../db/client.ts";

export async function audit(
  actorId: number | null,
  action: string,
  entity?: string,
  entityId?: string | number | null,
  meta?: unknown,
): Promise<void> {
  try {
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity, entity_id, meta) VALUES (?, ?, ?, ?, ?)`,
      [
        actorId,
        action,
        entity ?? null,
        entityId != null ? String(entityId) : null,
        meta ? JSON.stringify(meta) : null,
      ],
    );
  } catch (err) {
    console.error("[audit] failed:", err);
  }
}
