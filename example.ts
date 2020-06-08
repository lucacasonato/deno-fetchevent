import { serve } from "./mod.ts";

console.log("Listening on http://localhost:8080/");
for await (const event of serve(":8080")) {
  const { request } = event;

  console.log("---");
  console.log(request.url);
  console.log(request.method);
  if (request.body) console.log(await request.json());

  event.respondWith(Response.redirect("https://deno.land", 303));
}
