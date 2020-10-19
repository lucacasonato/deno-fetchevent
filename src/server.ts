import {
  HTTPOptions,
  HTTPSOptions,
  ServerRequest,
  StdServer,
} from "../deps.ts";
import { ReadableStreamIOReader } from "./toReader.ts";

export interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response> | Response): Promise<Response>;
}

class FetchEventImpl extends Event {
  public readonly request: Request;

  constructor(private stdReq: ServerRequest) {
    super("fetch");

    const host = stdReq.headers.get("host") ?? "example.com";

    this.request = new Request(
      new URL(stdReq.url, `http://${host}`).toString(),
      {
        body: new ReadableStream({
          start: async (controller) => {
            for await (const chunk of Deno.iter(stdReq.body)) {
              controller.enqueue(chunk);
            }
            controller.close();
          },
        }),
        headers: stdReq.headers,
        method: stdReq.method,
      },
    );
  }

  async respondWith(response: Promise<Response> | Response): Promise<Response> {
    const resp = await response;
    await this.stdReq.respond({
      headers: resp.headers,
      status: resp.status,
      body: resp.body != null
        ? new ReadableStreamIOReader(resp.body)
        : undefined,
    });
    return resp;
  }
}

Object.defineProperty(FetchEventImpl, "name", { value: "FetchEvent" });

//@ts-ignore
window.FetchEvent = FetchEventImpl;

export class Server implements AsyncIterable<FetchEvent> {
  private server: StdServer;

  constructor(public listener: Deno.Listener) {
    this.server = new StdServer(listener);
  }

  close(): void {
    this.server.close();
  }

  private async *iterator(): AsyncIterableIterator<FetchEvent> {
    for await (const req of this.server) {
      yield new FetchEventImpl(req);
    }
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<FetchEvent> {
    return this.iterator();
  }
}

/**
 * Start an HTTP server with given options
 *
 *     const options = { port: 443 };
 *     for await (const event of serve(options)) {
 *       event.respondWith(Response.redirect("https://deno.land", 303));
 *     }
 *
 * @param options Server configuration
 * @return Async iterable server instance for incoming events
 */
export function serve(addr: string | HTTPOptions): Server {
  if (typeof addr === "string") {
    const [hostname, port] = addr.split(":");
    addr = { hostname, port: Number(port) };
  }
  const listener = Deno.listen(addr);
  return new Server(listener);
}

/**
 * Start an HTTP server with given options and event handler
 *
 *     const options = { port: 8000 };
 *     listenAndServe(options, (event) => {
 *       event.respondWith(Response.redirect("https://deno.land", 303));
 *     });
 *
 * @param options Server configuration
 * @param handler Event handler
 */
export async function listenAndServe(
  addr: string | HTTPOptions,
  handler: (event: FetchEvent) => void,
): Promise<void> {
  const server = serve(addr);

  for await (const event of server) {
    handler(event);
  }
}

/**
 * Start an HTTPS server with given options
 *
 *     const options = {
 *       hostname: "localhost",
 *       port: 443,
 *       certFile: "./path/to/localhost.crt",
 *       keyFile: "./path/to/localhost.key",
 *     };
 *     for await (const event of serveTLS(options)) {
 *       event.respondWith(Response.redirect("https://deno.land", 303));
 *     }
 *
 * @param options Server configuration
 * @return Async iterable server instance for incoming events
 */
export function serveTLS(options: HTTPSOptions): Server {
  const listener = Deno.listenTls({ ...options, transport: "tcp" });
  return new Server(listener);
}

/**
 * Start an HTTPS server with given options and event handler
 *
 *     const options = {
 *       hostname: "localhost",
 *       port: 443,
 *       certFile: "./path/to/localhost.crt",
 *       keyFile: "./path/to/localhost.key",
 *     };
 *     listenAndServeTLS(options, (event) => {
 *       event.respondWith(Response.redirect("https://deno.land", 303));
 *     });
 *
 * @param options Server configuration
 * @param handler Event handler
 */
export async function listenAndServeTLS(
  options: HTTPSOptions,
  handler: (event: FetchEvent) => void,
): Promise<void> {
  const server = serveTLS(options);

  for await (const event of server) {
    handler(event);
  }
}
