# Guide: Server-Sent Events (SSE) Stream

**File covered:** `src/app/api/events/stream/route.ts`

---

## Purpose

This file implements a **Server-Sent Events (SSE)** endpoint. Unlike every other route in this project, which sends a single JSON response and closes the connection, this route **keeps the connection open** and sends data to the client continuously over time.

Right now it only sends a heartbeat pulse every 5 seconds for 30 seconds, then closes. It is a skeleton -- the foundation for a real-time event stream that could push notifications, live metric updates, or system alerts to the browser without the browser having to poll.

This is the most unusual route in the project, and it introduces concepts (streams, encoders, SSE protocol) that the other routes do not touch.

---

## Line-by-line walkthrough

```typescript
export async function GET() {
```

A standard GET handler. SSE connections are initiated by the browser with a normal GET request. The magic is in what gets returned.

```typescript
  const encoder = new TextEncoder();
```

`TextEncoder` converts JavaScript strings into `Uint8Array` byte sequences (specifically, UTF-8 encoded bytes). This is needed because `ReadableStream` works with raw bytes, not strings. Think of it as a translator between "human-readable text" and "wire format."

`TextEncoder` is a built-in web API -- you do not need to import it.

```typescript
  const stream = new ReadableStream({
```

`ReadableStream` is a web standard for producing data over time. Instead of building the entire response body up front, you create a stream that "drips" data out piece by piece. The browser receives each piece as it arrives.

The object passed to `new ReadableStream({...})` is called the **underlying source**. It contains callbacks that the stream calls at key moments.

```typescript
    start(controller) {
```

`start` is called once, immediately, when the stream is created. The `controller` is your handle for pushing data into the stream or closing it. It has two key methods:

- `controller.enqueue(chunk)` -- pushes a chunk of data into the stream.
- `controller.close()` -- signals that no more data will be sent.

```typescript
      const interval = setInterval(() => {
```

`setInterval` runs a callback repeatedly at a fixed interval. Here, it fires every 5000 milliseconds (5 seconds). Each time it fires, it pushes a new chunk of data into the stream.

```typescript
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`,
          ),
        );
```

Breaking this apart from the inside out:

1. `new Date().toISOString()` -- the current time as a string like `"2026-02-24T14:30:00.000Z"`.
2. `{ type: "heartbeat", timestamp: "..." }` -- a plain object representing the event payload.
3. `JSON.stringify(...)` -- converts it to a JSON string.
4. `` `data: ${...}\n\n` `` -- wraps it in the **SSE wire format**. This is not arbitrary formatting. The SSE specification requires each event to start with `data: `, contain the payload, and end with **two newlines** (`\n\n`). The double newline signals the end of one event. A single newline would be interpreted as a multi-line data field.
5. `encoder.encode(...)` -- converts the string to bytes.
6. `controller.enqueue(...)` -- pushes the bytes into the stream.

So every 5 seconds, the stream sends something like:

```
data: {"type":"heartbeat","timestamp":"2026-02-24T14:30:05.000Z"}

```

(Note the blank line -- that is the second `\n`.)

```typescript
      }, 5000);
```

The interval: 5000 milliseconds = 5 seconds between heartbeats.

```typescript
      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 30000);
```

After 30 seconds (30000 milliseconds), the stream shuts down:

1. `clearInterval(interval)` -- stops the repeating heartbeat.
2. `controller.close()` -- tells the stream (and the browser) that no more data is coming.

Without this timeout, the stream would run forever (or until the browser disconnects). In a production system, you might not have a fixed timeout -- you might keep the stream open as long as the client is connected. But for a demo/scaffold, a 30-second limit prevents resource leaks.

```typescript
    },
  });
```

End of the `start` callback and the stream constructor.

```typescript
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

Instead of `NextResponse.json(...)`, this returns a raw `Response` with the stream as its body. The headers are critical:

- **`Content-Type: text/event-stream`** -- tells the browser "this is an SSE stream." Without this, the browser treats it as a regular download and waits for the entire response to finish before processing it. With this header, the browser's `EventSource` API knows to process events as they arrive.

- **`Cache-Control: no-cache, no-transform`** -- prevents caches (browser cache, CDN, reverse proxy) from buffering the response. If a cache stored the stream and served it later, the client would receive stale data all at once instead of live events. `no-transform` tells intermediary proxies not to modify the response (some proxies try to compress or chunk responses in ways that break streaming).

- **`Connection: keep-alive`** -- signals that the TCP connection should remain open. This is the default in HTTP/1.1, but being explicit about it prevents misunderstandings with intermediary infrastructure.

Notice this route does **not** use the envelope pattern (`ok()` / `fail()`). That pattern is designed for single JSON responses. SSE is a fundamentally different protocol where each event is its own self-contained message. The envelope pattern does not apply here.

---

## Concepts taught

| Concept | What you just saw |
|---|---|
| **Server-Sent Events (SSE)** | A protocol for the server to push events to the browser over a single HTTP connection. |
| **ReadableStream** | The web standard for producing data incrementally instead of all at once. |
| **TextEncoder** | Converts strings to bytes, required for stream chunks. |
| **SSE wire format** | `data: <payload>\n\n` -- a specific text format the browser expects. |
| **setInterval / setTimeout** | JavaScript timers for repeating and delayed actions. |
| **Stream controller** | The `controller` object that lets you push data (`enqueue`) and signal completion (`close`). |
| **Response headers for streaming** | `text/event-stream`, `no-cache`, and `keep-alive` work together to make SSE function correctly. |

---

## Common mistakes

1. **Forgetting the double newline (`\n\n`).** A single `\n` after `data:` means the event is not terminated. The browser's `EventSource` will wait for the second newline before firing the `onmessage` callback. You will sit there wondering why no events are arriving. This is the number one SSE debugging headache.

2. **Using `NextResponse.json()` for a stream.** `NextResponse.json()` serializes an object and sends it as a complete response. It cannot send a stream. You must use `new Response(stream, { headers })` directly.

3. **Forgetting `clearInterval`.** If you call `controller.close()` without `clearInterval`, the interval keeps firing and tries to `enqueue` data into a closed stream. This throws a runtime error ("controller is closed" or similar).

4. **Not handling client disconnection.** This code does not detect when the browser closes the tab or navigates away. In a production system, you would listen for the connection being closed (via the `cancel` callback on the stream or `AbortSignal`) and clean up the interval. Without this, the interval runs for the full 30 seconds even after the client is gone, wasting server resources.

5. **Caching breaking the stream.** If you deploy behind a CDN (like Vercel's edge network or Cloudflare), the CDN might buffer the response. The `Cache-Control: no-cache` header helps, but some CDNs need explicit configuration to pass through SSE streams. If your stream works locally but not in production, caching is the first thing to check.

6. **Confusing SSE with WebSockets.** SSE is **one-directional** (server to client only). If you need the client to send messages back to the server, you need WebSockets or a different approach. SSE is simpler to set up and works over plain HTTP, which makes it ideal for use cases like live dashboards where the server pushes and the client just listens.

---

## Mini exercises

### Exercise 1 -- Consume the stream in the browser

Open your browser's developer console and run:

```javascript
const source = new EventSource("/api/events/stream");
source.onmessage = (event) => {
  console.log("Received:", JSON.parse(event.data));
};
source.onerror = (err) => {
  console.log("Stream ended or errored:", err);
};
```

Watch the console. You should see a heartbeat message every 5 seconds. After 30 seconds, the stream closes and `onerror` fires (which is normal -- SSE fires `onerror` when the connection closes).

### Exercise 2 -- Add event types

The SSE specification supports **named events** using the `event:` field. Modify the route to send two different event types: a `heartbeat` event every 5 seconds and a `metrics` event every 10 seconds with a random number. The wire format for a named event looks like:

```
event: metrics
data: {"cpu": 42}

```

Then update the browser code from Exercise 1 to listen for each type separately:

```javascript
source.addEventListener("heartbeat", (e) => console.log("Heartbeat:", e.data));
source.addEventListener("metrics", (e) => console.log("Metrics:", e.data));
```

<details>
<summary>Hint</summary>

In the route, use `encoder.encode(`event: metrics\ndata: ${JSON.stringify({cpu: Math.random() * 100})}\n\n`)`. The `event:` line must come before the `data:` line, and the whole thing must end with `\n\n`.

</details>

### Exercise 3 -- Handle client disconnection

Add cleanup logic so that when the client disconnects (closes the tab), the `setInterval` is cleared immediately instead of running for the full 30 seconds. Research the `cancel()` method on `ReadableStream`'s underlying source.

<details>
<summary>Hint</summary>

Add a `cancel()` callback to the object passed to `new ReadableStream`:

```typescript
const stream = new ReadableStream({
  start(controller) {
    const interval = setInterval(() => {
      // ...enqueue heartbeat...
    }, 5000);

    setTimeout(() => {
      clearInterval(interval);
      controller.close();
    }, 30000);

    // Store interval ID so cancel() can access it
    (this as any)._interval = interval;
    (this as any)._timeout = setTimeout(...);
  },
  cancel() {
    clearInterval((this as any)._interval);
    clearTimeout((this as any)._timeout);
  },
});
```

A cleaner approach is to declare `interval` and `timeout` variables in the outer scope so both `start` and `cancel` can access them via closure.

</details>

---

## Further reading

- **MDN -- Server-Sent Events:** https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- **MDN -- EventSource API:** https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- **MDN -- ReadableStream:** https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
- **SSE specification (HTML Living Standard):** https://html.spec.whatwg.org/multipage/server-sent-events.html
- **SSE vs WebSockets:** Search for "SSE vs WebSocket when to use" -- the trade-offs are well-documented. Short version: use SSE when data flows one way (server to client); use WebSockets when both sides need to send messages.
- **TextEncoder MDN docs:** https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
