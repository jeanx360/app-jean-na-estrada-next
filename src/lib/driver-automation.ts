import "server-only";

export type DriverAutomationResult = {
  ok: boolean;
  runId: string | null;
  source: string;
  scanned: number;
  created: number;
  skipped: number;
  expiredHidden: number;
  error: string | null;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function runDriverNotificationAutomations(
  supabase: any,
  source: "cron" | "admin" | "manual" | "test" = "manual",
): Promise<DriverAutomationResult> {
  const { data, error } = await supabase.rpc("run_driver_notification_automations", {
    selected_source: source,
  });

  if (error) {
    return {
      ok: false,
      runId: null,
      source,
      scanned: 0,
      created: 0,
      skipped: 0,
      expiredHidden: 0,
      error: error.message,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return {
    ok: row?.ok === true,
    runId: textValue(row?.runId),
    source: textValue(row?.source) ?? source,
    scanned: numberValue(row?.scanned),
    created: numberValue(row?.created),
    skipped: numberValue(row?.skipped),
    expiredHidden: numberValue(row?.expiredHidden),
    error: textValue(row?.error),
  };
}
