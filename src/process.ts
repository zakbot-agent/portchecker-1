import { execSync } from "child_process";

export interface ProcessInfo {
  pid: string;
  name: string;
  command: string;
}

const EMPTY_PROCESS: ProcessInfo = { pid: "-", name: "-", command: "-" };

/**
 * Find process info for a given port using `ss` (faster) with `ps` fallback.
 */
export function getProcessByPort(port: number): ProcessInfo {
  return tryWithSs(port) ?? tryWithLsof(port) ?? EMPTY_PROCESS;
}

/**
 * Get all listening ports and their process info using `ss`.
 */
export function getAllListeningPorts(): Map<number, ProcessInfo> {
  const result = new Map<number, ProcessInfo>();

  try {
    const output = execSync("ss -tlnp 2>/dev/null", { encoding: "utf-8" });
    const lines = output.split("\n").slice(1); // skip header

    for (const line of lines) {
      const portMatch = line.match(/:(\d+)\s/);
      const pidMatch = line.match(/pid=(\d+)/);

      if (!portMatch) continue;
      const port = parseInt(portMatch[1], 10);

      if (pidMatch) {
        const pid = pidMatch[1];
        const info = getProcessDetails(pid);
        result.set(port, { pid, ...info });
      } else {
        result.set(port, { ...EMPTY_PROCESS });
      }
    }
  } catch {
    // ss not available — fallback to lsof
    try {
      const output = execSync("lsof -iTCP -sTCP:LISTEN -nP 2>/dev/null", { encoding: "utf-8" });
      const lines = output.split("\n").slice(1);

      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 9) continue;

        const name = parts[0];
        const pid = parts[1];
        const addrPort = parts[8];
        const portStr = addrPort.split(":").pop();
        if (!portStr) continue;

        const port = parseInt(portStr, 10);
        const command = getCommandByPid(pid);
        result.set(port, { pid, name, command });
      }
    } catch {
      // neither tool available
    }
  }

  return result;
}

function tryWithSs(port: number): ProcessInfo | null {
  try {
    const output = execSync(`ss -tlnp sport = :${port} 2>/dev/null`, { encoding: "utf-8" });
    const pidMatch = output.match(/pid=(\d+)/);
    if (!pidMatch) return null;

    const pid = pidMatch[1];
    const info = getProcessDetails(pid);
    return { pid, ...info };
  } catch {
    return null;
  }
}

function tryWithLsof(port: number): ProcessInfo | null {
  try {
    const output = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -nP -t 2>/dev/null`, { encoding: "utf-8" });
    const pid = output.trim().split("\n")[0];
    if (!pid) return null;

    const info = getProcessDetails(pid);
    return { pid, ...info };
  } catch {
    return null;
  }
}

function getProcessDetails(pid: string): { name: string; command: string } {
  const name = getProcessName(pid);
  const command = getCommandByPid(pid);
  return { name, command };
}

function getProcessName(pid: string): string {
  try {
    return execSync(`ps -p ${pid} -o comm= 2>/dev/null`, { encoding: "utf-8" }).trim() || "-";
  } catch {
    return "-";
  }
}

function getCommandByPid(pid: string): string {
  try {
    const cmd = execSync(`ps -p ${pid} -o args= 2>/dev/null`, { encoding: "utf-8" }).trim();
    // Truncate long commands for display
    return cmd.length > 60 ? cmd.substring(0, 57) + "..." : cmd || "-";
  } catch {
    return "-";
  }
}
