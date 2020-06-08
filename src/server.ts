import { StdServer, ServerRequest, HTTPOptions } from "../deps.ts";
import { ReadableStreamIOReader } from "./toReader.ts";

export interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response> | Response): Promise<Response>;
}

class FetchEventImpl extends Event {
  public readonly request: Request;

  constructor(private stdReq: ServerRequest) {
    super("fetch");

    this.request = new Request(stdReq.url, {
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
    });
  }

  async respondWith(response: Promise<Response> | Response): Promise<Response> {
    const resp = await response;
    await this.stdReq.respond({
      headers: resp.headers,
      status: resp.status,
      body:
        resp.body != null ? new ReadableStreamIOReader(resp.body) : undefined,
    });
    return resp;
  }
}

Object.defineProperty(FetchEventImpl, "name", { value: "FetchEvent" });

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

export function serve(addr: string | HTTPOptions): Server {
  if (typeof addr === "string") {
    const [hostname, port] = addr.split(":");
    addr = { hostname, port: Number(port) };
  }
  const listener = Deno.listen(addr);
  return new Server(listener);
}
