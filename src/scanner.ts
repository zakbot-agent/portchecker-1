import * as net from "net";

const COMMON_DEV_PORTS = [3000, 3001, 4000, 5000, 5173, 5174, 8000, 8080, 8888, 9000];

export interface PortStatus {
  port: number;
  open: boolean;
}

/**
 * Check if a single port is in use by attempting a TCP connection.
 */
function checkPort(port: number, timeout = 200): Promise<PortStatus> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const done = (open: boolean) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({ port, open });
    };

    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, "127.0.0.1");
  });
}

/**
 * Scan multiple ports in parallel.
 */
export async function scanPorts(ports: number[]): Promise<PortStatus[]> {
  const results = await Promise.all(ports.map((p) => checkPort(p)));
  return results.sort((a, b) => a.port - b.port);
}

/**
 * Generate an array of ports from a range string like "3000-3010".
 */
export function parseRange(range: string): number[] {
  const [startStr, endStr] = range.split("-");
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);

  if (isNaN(start) || isNaN(end) || start > end || start < 0 || end > 65535) {
    throw new Error(`Invalid port range: ${range}`);
  }

  const ports: number[] = [];
  for (let i = start; i <= end; i++) {
    ports.push(i);
  }
  return ports;
}

/**
 * Return the list of common dev ports.
 */
export function getCommonPorts(): number[] {
  return [...COMMON_DEV_PORTS];
}
