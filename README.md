# Deno FetchEvent

This project is a prototype of what a FetchEvent based http server would feel like. For more background, take a look at https://github.com/denoland/deno/issues/4898.

> **DISCLAIMER**: This is not tested at all. Please do not use this for anything important. This is just a prototype and will not be developed further.

## Example

```typescript
import { serve } from "https://raw.githubusercontent.com/lucacasonato/deno-fetchevent/master/mod.ts";

console.log("Listening on http://localhost:8080/");
for await (const event of serve(":8080")) {
  const { request } = event;

  console.log("---");
  console.log(request.url);
  console.log(request.method);
  if (request.body) console.log(await request.json());

  event.respondWith(Response.redirect("https://deno.land", 303));
}
```

Quick start:

```
deno run --allow-net https://raw.githubusercontent.com/lucacasonato/deno-fetchevent/master/example.ts
```
