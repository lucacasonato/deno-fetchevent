export class ReadableStreamIOReader implements Deno.Reader {
  #reader: ReadableStreamDefaultReader;
  #buffer: Uint8Array | null;
  #encoder: TextEncoder;
  constructor(dst: ReadableStream) {
    this.#reader = dst.getReader();
    this.#buffer = null;
    this.#encoder = new TextEncoder();
  }

  async read(p: Uint8Array): Promise<number | null> {
    let value = this.#buffer;
    if (value === null) {
      // if buffer is empty, read from the stream
      const res = await this.#reader.read();
      if (res.done) {
        this.#reader.releaseLock();
        return null; // EOF
      }

      value = res.value;

      if (!value) {
        return 0;
      }

      if (typeof value === "string") {
        value = this.#encoder.encode(value);
      }
    } else if (this.#buffer !== null && p.length >= this.#buffer.length) {
      // If buffer size is lower or equal than view size, set buffer to null
      this.#buffer = null;
    }

    if (value.length > p.length) {
      // If chunk is bigger than view buffer exceeding bytes
      this.#buffer = value.subarray(p.length);
      value = value.subarray(0, p.length);

      if (!this.#buffer.length) {
        this.#buffer = null;
      }
    }

    p.set(value, 0);
    return value.length;
  }
}
