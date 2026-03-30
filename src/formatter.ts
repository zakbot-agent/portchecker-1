import { PortStatus } from "./scanner";
import { ProcessInfo } from "./process";

// ANSI color codes — zero dependencies
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
};

export interface PortResult {
  port: number;
  open: boolean;
  process: ProcessInfo;
}

/**
 * Format results as a colored table for terminal output.
 */
export function formatTable(results: PortResult[]): string {
  if (results.length === 0) return `${C.dim}No ports to display.${C.reset}`;

  // Column widths
  const cols = { port: 7, status: 10, pid: 8, process: 16, command: 50 };
  const lines: string[] = [];

  // Header
  const header =
    `${C.bold}${C.cyan}` +
    pad("PORT", cols.port) +
    pad("STATUS", cols.status) +
    pad("PID", cols.pid) +
    pad("PROCESS", cols.process) +
    pad("COMMAND", cols.command) +
    C.reset;

  const separator = C.dim + "─".repeat(cols.port + cols.status + cols.pid + cols.process + cols.command) + C.reset;

  lines.push("");
  lines.push(header);
  lines.push(separator);

  for (const r of results) {
    const statusColor = r.open ? C.red : C.green;
    const statusText = r.open ? "IN USE" : "FREE";
    const statusBadge = `${statusColor}${C.bold}${statusText}${C.reset}`;

    // Pad status accounting for ANSI codes
    const statusPadded = statusBadge + " ".repeat(Math.max(0, cols.status - statusText.length));

    const line =
      `${C.white}${pad(String(r.port), cols.port)}${C.reset}` +
      statusPadded +
      `${C.dim}${pad(r.process.pid, cols.pid)}${C.reset}` +
      `${C.yellow}${pad(r.process.name, cols.process)}${C.reset}` +
      `${C.dim}${r.process.command}${C.reset}`;

    lines.push(line);
  }

  lines.push(separator);

  const inUse = results.filter((r) => r.open).length;
  const free = results.filter((r) => !r.open).length;
  lines.push(
    `${C.dim}Total: ${results.length} ports scanned | ${C.red}${inUse} in use${C.dim} | ${C.green}${free} free${C.reset}`
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Format results as JSON.
 */
export function formatJson(results: PortResult[]): string {
  const data = results.map((r) => ({
    port: r.port,
    status: r.open ? "in_use" : "free",
    pid: r.process.pid,
    process: r.process.name,
    command: r.process.command,
  }));
  return JSON.stringify(data, null, 2);
}

function pad(str: string, width: number): string {
  return str.length >= width ? str + " " : str + " ".repeat(width - str.length);
}
