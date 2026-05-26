export const KILL_SWITCHES = {
  AI_EXECUTION_ENABLED: "AI_EXECUTION_ENABLED",
  EXTERNAL_TOOLCALL_ENABLED: "EXTERNAL_TOOLCALL_ENABLED",
  WEBHOOK_PROCESSING_ENABLED: "WEBHOOK_PROCESSING_ENABLED",
  WORKER_CONSUMING_ENABLED: "WORKER_CONSUMING_ENABLED",
  BILLING_SIDE_EFFECTS_ENABLED: "BILLING_SIDE_EFFECTS_ENABLED",
  PLUGIN_EXECUTION_ENABLED: "PLUGIN_EXECUTION_ENABLED",
} as const;

export type KillSwitchName = keyof typeof KILL_SWITCHES;

export function assertKillSwitchEnabled(name: KillSwitchName): void {
  if (process.env[name] !== "true") {
    throw new Error(
      `KILL_SWITCH_BLOCKED: ${name} is not enabled. Set ${name}=true to allow this operation.`,
    );
  }
}

export function isKillSwitchEnabled(name: KillSwitchName): boolean {
  return process.env[name] === "true";
}
