import { getAgentState } from '@/app/lib/agent/orchestrator';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const state = await getAgentState();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
        } catch {}
      };

      await send();
      const interval = setInterval(send, 10000);

      // Keep alive
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 30000);

      (controller as any)._cleanup = () => {
        clearInterval(interval);
        clearInterval(keepAlive);
      };
    },
    cancel() {
      (this as any)._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
