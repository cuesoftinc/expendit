const floors = { debug: 0, info: 1, warn: 2, error: 3 } as const;

type Level = keyof typeof floors;

const methods = [
  ["debug", "debug", "DEBUG"],
  ["log", "info", "INFO"],
  ["info", "info", "INFO"],
  ["warn", "warn", "WARNING"],
  ["error", "error", "ERROR"],
] as const;

// On Cloud Run every server console call becomes one JSON line on stdout with
// a Cloud Logging severity, filtered at LOG_LEVEL (info when unset).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.K_SERVICE) {
    const { format } = await import("node:util");
    const floor = floors[level(process.env.LOG_LEVEL)];
    for (const [method, name, severity] of methods) {
      console[method] =
        floors[name] < floor
          ? () => undefined
          : (...args: unknown[]) => {
              process.stdout.write(
                `${JSON.stringify({ severity, message: format(...args) })}\n`,
              );
            };
    }
  }
}

function level(value = ""): Level {
  const name = value.trim().toLowerCase();
  if (name === "warning") return "warn";
  return Object.hasOwn(floors, name) ? (name as Level) : "info";
}
