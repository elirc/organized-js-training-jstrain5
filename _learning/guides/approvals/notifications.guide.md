# Guide: Approval Notifications

**File:** `src/lib/approvals/notifications.ts`

## Purpose

When an operation needs approval, someone has to actually *know* about it. This file handles notifying the right people that an approval request is waiting for them.

In a real system, this might send a Slack message, an email, a push notification, or all three. The person who submitted the operation is stuck waiting until an approver sees the notification and acts on it. If nobody gets notified, the approval sits there forever and the operation never happens. That makes this function deceptively important -- it is the bridge between "approval requested" and "approval granted."

Right now it is a stub that returns a confirmation object without actually sending anything.

## The Code

```typescript
export async function notifyApprovers(approvalId: string) {
  return { approvalId, notified: true };
}
```

## Line-by-Line Walkthrough

### `export async function notifyApprovers(approvalId: string) {`

- `export` -- available to the rest of the application.
- `async` -- the real implementation will send network requests (Slack API, email service, etc.), so this must be async. Even though the stub does nothing asynchronous, the signature is correct for the future.
- `notifyApprovers` -- plural "Approvers" is meaningful. There might be multiple people who can approve an operation, and you would notify all of them.
- `approvalId: string` -- identifies *which* approval request the notification is about. The notification would include a link or reference to this specific approval so the approver can find it.

### `return { approvalId, notified: true };`

- Returns an object confirming the notification was "sent." The `notified: true` is optimistic -- the real implementation would need to handle failures (what if the Slack API is down?).
- Notice there is no `as const` on `true` here, unlike `"pending" as const` in the service file. That is because `true` is already a literal type in TypeScript -- there is no wider type it could be confused with. A boolean can only be `true` or `false`, so TypeScript already narrows this correctly.

## Honesty About Code Quality

This is one of the thinnest stubs in the codebase. A real notification system would need to handle:

- **Who to notify** -- The function only takes an `approvalId` but does not look up who the approvers are. A real version would query the approval request, figure out the right approvers based on the operation type, team, or escalation rules, and notify each one.
- **Multiple channels** -- Slack, email, SMS, in-app notifications. Different approvers might prefer different channels.
- **Delivery tracking** -- Did the notification actually arrive? What if it bounced?
- **Retry logic** -- If the notification service is temporarily down, you need to retry.
- **Rate limiting** -- You do not want to spam someone with 50 notifications in a minute.
- **Idempotency** -- If this function gets called twice for the same approval (which happens in distributed systems), it should not send duplicate notifications.

The stub is fine for now. It lets the rest of the system work as if notifications are being sent.

## Concepts Taught

1. **Side effects in async functions** -- This function's entire purpose is a side effect: sending a notification to an external system. Unlike a pure function that just computes a value, this function exists to change the world outside your application. Side-effectful functions are harder to test and harder to reason about, which is why you isolate them in their own module.

2. **Optimistic return values** -- The stub returns `notified: true` without doing anything. This pattern (returning success before confirming it) is common in stubs but dangerous in production. In real code, you would only return `true` after confirming the notification was delivered.

3. **Separation of concerns** -- Notice that this file only handles *notifications*. It does not create approvals (that is `service.ts`) and it does not decide whether approval is needed (that is `policies.ts`). Each file has one job.

4. **The notification pattern** -- Notifications are a cross-cutting concern in most applications. You will see notification modules in nearly every production system, and they almost always end up more complex than expected.

## Common Mistakes

1. **Assuming notifications always succeed** -- Network calls fail. Services go down. A common junior mistake is not handling the case where the notification fails to send. In production, you need try/catch and a fallback strategy.

2. **Fire and forget without tracking** -- It is tempting to send a notification and move on. But what if nobody received it? Production systems track whether notifications were delivered and alert if something goes wrong.

3. **Tight coupling to a specific channel** -- If you hardcode "send a Slack message" directly in this function, you cannot easily add email or SMS later. The better pattern is to have this function decide *who* to notify, then delegate the *how* to channel-specific modules.

4. **Not thinking about the approver's experience** -- The notification should include enough context for the approver to make a decision: what operation, who requested it, why it was flagged, and a link to approve/deny. Just saying "you have a pending approval" is not helpful.

## Mini Exercises

### Exercise 1: Return More Useful Data
Modify the return object to include a `sentAt` timestamp (ISO string) and a `channel` field set to `"slack"`. This simulates tracking which channel was used and when.

<details>
<summary>Hint</summary>

```typescript
return {
  approvalId,
  notified: true,
  sentAt: new Date().toISOString(),
  channel: "slack" as const,
};
```

</details>

### Exercise 2: Accept Multiple Approver IDs
Change the function signature to also accept `approverIds: string[]`. Return an array of notification results, one for each approver. Use `.map()` on the array.

<details>
<summary>Hint</summary>

```typescript
export async function notifyApprovers(approvalId: string, approverIds: string[]) {
  return approverIds.map(id => ({ approvalId, approverId: id, notified: true }));
}
```

</details>

### Exercise 3: Simulate a Failure
Add a parameter `simulateFailure: boolean = false`. If it is true, throw an `Error` with a message like `"Notification service unavailable"`. Then call this function from a scratch file and handle the error with try/catch.

<details>
<summary>Hint</summary>

```typescript
export async function notifyApprovers(approvalId: string, simulateFailure = false) {
  if (simulateFailure) throw new Error("Notification service unavailable");
  return { approvalId, notified: true };
}
```

</details>

## Further Reading

- **Error handling in async functions** -- Learn how `try/catch` works with `await`, and what happens when a Promise rejects without being caught.
- **Idempotency** -- A critical concept for notifications. Search for "idempotent API design" to understand why sending the same notification twice should not cause duplicate messages.
- **Message queues** -- In production, notifications are often sent through a queue (like RabbitMQ, SQS, or Redis) rather than directly, so they can be retried if they fail. Look into "message queue patterns."
- **Observer/pub-sub pattern** -- Notifications are a natural fit for the publish-subscribe pattern. The approval system *publishes* an event, and the notification system *subscribes* to it.
