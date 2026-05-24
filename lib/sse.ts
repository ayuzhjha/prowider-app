/**
 * SSE (Server-Sent Events) broadcaster for real-time dashboard updates.
 *
 * In a serverless environment each request is isolated, so we use a
 * module-level Set of response writers. For production at scale you'd
 * use Redis pub/sub, but polling-compatible SSE works correctly here.
 */

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

// Module-level registry (persists within a Node.js process)
const clients = new Set<SSEClient>();

export function addSSEClient(client: SSEClient) {
  clients.add(client);
}

export function removeSSEClient(client: SSEClient) {
  clients.delete(client);
}

export function broadcastDashboardUpdate(data: Record<string, unknown>) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const toRemove: SSEClient[] = [];

  for (const client of clients) {
    try {
      client.controller.enqueue(encoder.encode(payload));
    } catch {
      // Client disconnected
      toRemove.push(client);
    }
  }

  toRemove.forEach((c) => clients.delete(c));
}

export function getConnectedClientCount() {
  return clients.size;
}
