# Guide: API Response Envelope

**File covered:** `src/lib/http/envelope.ts`

---

## Purpose

Every API in this project wraps its response in a predictable shape before sending it back to the browser. That shape is called an **envelope**. Instead of returning raw data one time and an error string the next, every single endpoint returns an object that always has a `success` field. If `success` is `true`, there is a `data` field. If `success` is `false`, there is an `error` field. No guessing, no surprises.

This tiny file (under 20 lines) exists so that the front-end code never has to wonder "did this response fail? Where is the error message hiding?" The answer is always in the same place.

---

## Line-by-line walkthrough

```typescript
export type ApiError = {
  code: string;
  message: string;
};
```

This defines what an error looks like everywhere in the app. Two fields:

- `code` -- a short, machine-readable label like `"NOT_FOUND"` or `"VALIDATION_ERROR"`. Code you write can switch on this string without worrying about someone rewording a sentence.
- `message` -- a human-readable explanation like `"Customer not found."`. This is what you might show to a user or log for debugging.

Both are plain strings. Nothing fancy.

```typescript
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
```

This is the envelope itself. The `<T>` is a **generic type parameter** -- it is a placeholder that gets filled in later. If you are returning a list of customers, `T` becomes `Customer[]`. If you are returning a single number, `T` becomes `number`.

The `|` (pipe) between the two object types creates a **discriminated union**. TypeScript understands that when `success` is `true`, the object *must* have `data` and *cannot* have `error`, and vice versa. That means if you write:

```typescript
if (response.success) {
  console.log(response.data); // TypeScript knows `data` exists here
} else {
  console.log(response.error); // TypeScript knows `error` exists here
}
```

...you get full autocomplete and type-checking in each branch for free.

```typescript
export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}
```

A helper that builds a success envelope. Instead of writing `{ success: true, data: someValue }` in every route handler, you write `ok(someValue)`. Less typing, less chance of a typo on the `success` field.

The `<T>` here means TypeScript will **infer** T from whatever you pass in. Call `ok(42)` and the return type is `ApiResponse<number>`. Call `ok([customer1, customer2])` and TypeScript figures out the right array type automatically.

```typescript
export function fail(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}
```

A helper that builds a failure envelope. Notice the return type is `ApiResponse<never>`. The `never` type means "there is no data here -- ever." Since `success` is `false`, the `data` field does not exist on the returned object. Using `never` makes that explicit at the type level, which means `fail(...)` is compatible with `ApiResponse<Customer>`, `ApiResponse<number>`, or any other `ApiResponse<T>`. It slots in anywhere.

---

## Concepts taught

| Concept | What you just saw |
|---|---|
| **Type aliases** | `type ApiError = { ... }` gives a name to a shape. |
| **Generics** | `<T>` lets one type or function work with many different data shapes. |
| **Discriminated unions** | The `success` field lets TypeScript narrow the type in `if`/`else` blocks. |
| **The `never` type** | Represents "this cannot happen," used here because error responses carry no data. |
| **Envelope pattern** | Wrapping every API response in a consistent outer shape. |
| **Helper / factory functions** | `ok()` and `fail()` are tiny factories that prevent repetitive object construction. |

---

## Common mistakes

1. **Forgetting to check `success` before accessing `data`.** If you skip the check, TypeScript will complain (good), but at runtime in plain JavaScript you would get `undefined` silently. Always branch on `success` first.

2. **Returning raw data without the envelope.** If one route returns `NextResponse.json(customer)` instead of `NextResponse.json(ok(customer))`, the front end will break because it expects `{ success, data }`.

3. **Using a generic error string instead of a code.** Codes like `"NOT_FOUND"` are stable. Messages like `"Customer not found."` can change. Build logic around codes, show messages to humans.

4. **Thinking `never` means "error."** `never` is a TypeScript concept meaning "no value can inhabit this type." It has nothing to do with errors specifically -- it just happens to be useful here because the error branch carries no `data`.

---

## Mini exercises

### Exercise 1 -- Read the types

Without running any code, answer: what is the TypeScript type of `response.data` after this block?

```typescript
const response: ApiResponse<string[]> = ok(["alpha", "bravo"]);
if (response.success) {
  // What is the type of response.data here?
}
```

<details>
<summary>Answer</summary>

`string[]`. The generic `T` was filled in with `string[]`, and inside the `if (response.success)` branch, TypeScript narrows the union to `{ success: true; data: string[] }`.

</details>

### Exercise 2 -- Add a warning envelope

Create a new helper function called `warn` that returns a success response but also includes a `warning` string. You will need to decide: do you change `ApiResponse`, or create a new type? Think about the trade-offs before writing code.

<details>
<summary>Hint</summary>

One approach is to add an optional `warning?: string` field to the success branch of `ApiResponse`. Another is to create a completely separate type like `ApiResponseWithWarning<T>`. The first is simpler but changes the contract for every consumer. The second is safer but adds complexity. There is no single right answer -- the point is to think about it.

</details>

### Exercise 3 -- Make `fail` accept an optional HTTP status

Right now `fail()` only builds the response body. The HTTP status code (like 400 or 404) is set separately in the route handler. Write a version of `fail` that optionally accepts a `status` number and returns an object containing both the body and the status, so the route handler can destructure it in one step.

<details>
<summary>Hint</summary>

You could return `{ body: { success: false, error: { code, message } }, status }` and then use it like:
```typescript
const { body, status } = fail("NOT_FOUND", "Customer not found.", 404);
return NextResponse.json(body, { status });
```
</details>

---

## Further reading

- **TypeScript Handbook -- Generics:** https://www.typescriptlang.org/docs/handbook/2/generics.html
- **TypeScript Handbook -- Narrowing (discriminated unions):** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- **The `never` type explained:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#the-never-type
- **JSON:API specification** (a well-known envelope convention): https://jsonapi.org/
- **RFC 7807 -- Problem Details for HTTP APIs** (another standard for error shapes): https://datatracker.ietf.org/doc/html/rfc7807
