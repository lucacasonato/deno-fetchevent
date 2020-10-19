import { serve } from "./mod.ts";

console.log("Listening on http://localhost:8080/");
for await (const event of serve(":8080")) {
  const { request } = event;

  console.log("---");
  console.log(request.url);
  console.log(request.method);
  if (request.body) console.log(await request.text());

  event.respondWith(
    new Response("404 not found", {
      headers: { "content-type": "text/plain" },
      status: 404,
    }),
  );
}
