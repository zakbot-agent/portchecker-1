#!/usr/bin/env node

import { scanPorts, parseRange, getCommonPorts, PortStatus } from "./scanner";
import { getProcessByPort, getAllListeningPorts } from "./process";
import { formatTable, formatJson, PortResult } from "./formatter";

const USAGE = `
\x1b[1m\x1b[36mportchecker\x1b[0m — Ultra-fast local port scanner

\x1b[1mUsage:\x1b[0m
  portchecker <port>          Check a single port
  portchecker <start>-<end>   Scan a range of ports
  portchecker --common        Scan common dev ports
  portchecker --all           Show all listening ports
  portchecker --help          Show this help

\x1b[1mFlags:\x1b[0m
  --json                      Output as JSON

\x1b[1mExamples:\x1b[0m
  portchecker 3000
  portchecker 3000-3010
  portchecker --common --json
  portchecker --all
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }

  const jsonOutput = args.includes("--json");
  const filteredArgs = args.filter((a) => a !== "--json");

  let results: PortResult[];

  if (filteredArgs.includes("--all")) {
    results = handleAllPorts();
  } else if (filteredArgs.includes("--common")) {
    results = await handlePortList(getCommonPorts());
  } else {
    const target = filteredArgs[0];
    if (!target) {
      console.error("Error: no port specified.");
      process.exit(1);
    }

    const ports = target.includes("-") ? parseRange(target) : [parseSinglePort(target)];
    results = await handlePortList(ports);
  }

  console.log(jsonOutput ? formatJson(results) : formatTable(results));
}

async function handlePortList(ports: number[]): Promise<PortResult[]> {
  const statuses = await scanPorts(ports);
  return statuses.map(toPortResult);
}

function handleAllPorts(): PortResult[] {
  const listening = getAllListeningPorts();
  const results: PortResult[] = [];

  for (const [port, info] of listening) {
    results.push({ port, open: true, process: info });
  }

  return results.sort((a, b) => a.port - b.port);
}

function toPortResult(status: PortStatus): PortResult {
  const processInfo = status.open ? getProcessByPort(status.port) : { pid: "-", name: "-", command: "-" };
  return { port: status.port, open: status.open, process: processInfo };
}

function parseSinglePort(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 0 || port > 65535) {
    console.error(`Error: invalid port "${value}". Must be 0-65535.`);
    process.exit(1);
  }
  return port;
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
