import { describe, expect, it } from "vitest";
import { toLocalReturnUrl } from "./returnUrl";

describe("toLocalReturnUrl", () => {
  it("accepts a plain absolute path", () => {
    expect(toLocalReturnUrl("/decks")).toBe("/decks");
  });

  it("accepts a deep path with query and hash", () => {
    expect(toLocalReturnUrl("/decks/abc/edit?tab=slides#s3")).toBe(
      "/decks/abc/edit?tab=slides#s3",
    );
  });

  it("accepts the bare root", () => {
    expect(toLocalReturnUrl("/")).toBe("/");
  });

  it("rejects undefined and empty", () => {
    expect(toLocalReturnUrl(undefined)).toBeUndefined();
    expect(toLocalReturnUrl("")).toBeUndefined();
  });

  it("rejects absolute URLs", () => {
    expect(toLocalReturnUrl("https://evil.tld/decks")).toBeUndefined();
  });

  it("rejects protocol-relative URLs", () => {
    expect(toLocalReturnUrl("//evil.tld/decks")).toBeUndefined();
  });

  it("rejects backslash host tricks", () => {
    expect(toLocalReturnUrl("/\\evil.tld/decks")).toBeUndefined();
  });

  it("rejects whitespace-smuggled protocol-relative URLs", () => {
    // The WHATWG parser strips tab/CR/LF before parsing, so these all
    // resolve to //evil.tld despite not literally starting with "//".
    expect(toLocalReturnUrl("/\t/evil.tld")).toBeUndefined();
    expect(toLocalReturnUrl("/\n/evil.tld")).toBeUndefined();
    expect(toLocalReturnUrl("/\r/evil.tld")).toBeUndefined();
  });

  it("accepts a same-origin path with smuggled whitespace", () => {
    // Harmless once the browser strips it — still resolves on our origin.
    expect(toLocalReturnUrl("/\tdecks")).toBe("/\tdecks");
  });

  it("accepts a path with a query string alone", () => {
    expect(toLocalReturnUrl("/decks?sort=name")).toBe("/decks?sort=name");
  });

  it("rejects relative paths and schemes", () => {
    expect(toLocalReturnUrl("decks")).toBeUndefined();
    expect(toLocalReturnUrl("javascript:alert(1)")).toBeUndefined();
  });
});
