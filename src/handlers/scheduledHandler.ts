import * as db from "@/database/d1";
import * as r2 from "@/database/r2";
import { now } from "@/utils/helpers";
import { logInfo } from "@/utils/logger";
import { sendMessage } from "@/utils/telegram";

/**
 * Cloudflare Scheduled Function - runs every 24h at 00:00 UTC
 * Full wipe: deletes ALL emails + attachments + R2 objects to keep D1/R2 Free tier empty
 */
export async function handleScheduled(
	_event: ScheduledEvent,
	env: CloudflareBindings,
	ctx: ExecutionContext,
) {
	try {
		// If HOURS_TO_DELETE_D1 is 24+ we do full wipe; otherwise fallback to old behavior
		const hours = Number(env.HOURS_TO_DELETE_D1) || 24;

		if (hours >= 24) {
			// 24h mode: delete everything
			const r2Res = await r2.deleteAllR2Objects(env.R2);
			const dbRes = await db.deleteAllEmails(env.D1);

			if (dbRes.success) {
				const msg = `✅ 24h wipe: D1 ${dbRes.meta?.changes ?? 0} rows deleted, R2 ${r2Res.deletedCount} objects deleted`;
				logInfo(msg);
				ctx.waitUntil(sendMessage(msg, env));
				return;
			}
			throw dbRes.error || new Error("deleteAllEmails failed");
		}

		// Legacy: delete only old emails
		const cutoffTimestamp = now() - hours * 60 * 60;
		const { success, error } = await db.deleteOldEmails(env.D1, cutoffTimestamp);
		if (success) {
			logInfo("Email cleanup completed successfully.");
			ctx.waitUntil(sendMessage("✅ Email cleanup completed successfully.", env));
		} else {
			throw error || new Error("deleteOldEmails failed");
		}
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		const errorMessage = `❌ Email cleanup failed: ${msg}`;
		ctx.waitUntil(sendMessage(errorMessage, env));
		throw new Error(errorMessage);
	}
}
