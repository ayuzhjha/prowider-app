/**
 * GET /api/sse/dashboard
 *
 * Server-Sent Events endpoint for real-time dashboard updates.
 * Clients connect once and receive push notifications when new leads arrive.
 *
 * Protocol:
 * - Sends a "connected" event on connect with timestamp
 * - Sends heartbeat every 15 seconds to keep connection alive
 * - Sends "new_lead" events when allocateProviders() completes
 */

import { NextRequest } from "next/server";
import { addSSEClient, removeSSEClient } from "@/lib/sse";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clientId = randomUUID();

  let clientRef: { id: string; controller: ReadableStreamDefaultController } | null = null;

  const stream = new ReadableStream({
    start(controller) {
      clientRef = { id: clientId, controller };
      addSSEClient(clientRef);

      const encoder = new TextEncoder();

      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", clientId, timestamp: new Date().toISOString() })}\n\n`
        )
      );

      // Heartbeat every 15 seconds to prevent timeout/disconnect
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`
            )
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        if (clientRef) {
          removeSSEClient(clientRef);
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      if (clientRef) {
        removeSSEClient(clientRef);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
      "Access-Control-Allow-Origin": "*",
    },
  });
}
