import { registerProcessor, runWorkerLoop } from "@tradeos/job-core";
import { processWebhookEvent } from "./processors/webhook";
import { archiveWebhookPayloads } from "./processors/archive";

registerProcessor("PROCESS_WEBHOOK_EVENT", processWebhookEvent);
registerProcessor("ARCHIVE_WEBHOOK_PAYLOADS", archiveWebhookPayloads);

const logger = {
  info: (msg: string, extra?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        msg,
        ...extra,
      }),
    );
  },
  error: (msg: string, extra?: Record<string, unknown>) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        msg,
        ...extra,
      }),
    );
  },
};

logger.info("[worker] Registered processors. Starting loop...");

runWorkerLoop().catch((error) => {
  logger.error("[worker] Fatal error", { error: String(error) });
  process.exit(1);
});
