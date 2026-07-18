export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "heartbeat",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        );
      }, 5000);

      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 30000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
