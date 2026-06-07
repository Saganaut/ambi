import { describe, it, expect } from "vitest";
import { validateText, inputAttrs } from "./fieldValidation";
import { validation } from "@store/validationConstants";

// Exercise the helper against REAL generated facets so the test also guards that
// the bridge keeps carrying the bounds the forms rely on.
const username = validation.RegisterRequest.username;
const deckName = validation.UpdateDeckRequest.name;

describe("validateText", () => {
  it("rejects values under minLength", () => {
    expect(validateText("ab", username)).toBe("Must be at least 3 characters");
  });

  it("rejects values over maxLength", () => {
    expect(validateText("a".repeat(deckName.maxLength + 1), deckName)).toBe(
      `Must be ${deckName.maxLength} characters or less`,
    );
  });

  it("rejects pattern mismatches with the override message", () => {
    expect(
      validateText("bad name!", username, { patternMessage: "letters only" }),
    ).toBe("letters only");
  });

  it("flags an empty value only when required", () => {
    expect(validateText("", deckName)).toBeNull();
    expect(validateText("  ", deckName, { required: true, label: "Name" })).toBe(
      "Name is required",
    );
  });

  it("accepts a valid value", () => {
    expect(validateText("good.name_1", username)).toBeNull();
  });
});

describe("inputAttrs", () => {
  it("exposes maxLength when present", () => {
    expect(inputAttrs(username)).toEqual({ maxLength: username.maxLength });
  });

  it("omits maxLength when absent", () => {
    expect(inputAttrs(validation.MoveSlideRequest.to)).toEqual({});
  });
});
