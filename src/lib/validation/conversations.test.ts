import { describe, expect, it } from "vitest";
import { z } from "zod";
import { sendMessageSchema } from "./conversations";

const conversationId = "49000000-0000-4000-8000-000000000001";

function errors(body: unknown, id: unknown = conversationId) {
  const result = sendMessageSchema.safeParse({ conversationId: id, body });
  return result.success ? null : z.flattenError(result.error).fieldErrors;
}

describe("sendMessageSchema", () => {
  it("trims the body and keeps inner line breaks", () => {
    expect(
      sendMessageSchema.parse({ conversationId, body: "  \n Hello\nthere \n" }),
    ).toEqual({ conversationId, body: "Hello\nthere" });
  });

  it("stores line breaks from form data as \\n", () => {
    expect(
      sendMessageSchema.parse({ conversationId, body: "Ред 1\r\nРед 2\rРед 3" })
        .body,
    ).toBe("Ред 1\nРед 2\nРед 3");
  });

  it("counts a line break once, like the browser's field", () => {
    const body = `${"a".repeat(999)}\r\n${"b".repeat(1000)}`;
    expect(errors(body)).toBeNull();
    expect(sendMessageSchema.parse({ conversationId, body }).body).toHaveLength(
      2000,
    );
  });

  it.each([
    ["empty", ""],
    ["only line breaks from form data", "\r\n\r\n"],
    ["only spaces and line breaks", " \n\t \n"],
    ["missing", null],
  ])("requires a body (%s)", (_, body) => {
    expect(errors(body)).toEqual({ body: ["required"] });
  });

  it("accepts 2000 characters and rejects 2001", () => {
    expect(errors("a".repeat(2000))).toBeNull();
    expect(errors(` ${"a".repeat(2000)} `)).toBeNull();
    expect(errors("a".repeat(2001))).toEqual({ body: ["messageTooLong"] });
  });

  it("requires a valid conversation id", () => {
    expect(errors("Hi", "abc")).toEqual({ conversationId: ["invalidValue"] });
  });
});
