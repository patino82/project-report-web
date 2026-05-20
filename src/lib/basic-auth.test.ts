import { describe, expect, it } from "vitest";
import { isBasicAuthAllowed, isBasicAuthConfigured } from "./basic-auth";

function authHeader(username: string, password: string) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

describe("basic auth gate", () => {
  it("allows all requests when credentials are not configured", () => {
    expect(isBasicAuthConfigured({})).toBe(false);
    expect(isBasicAuthAllowed(new Headers(), {})).toBe(true);
  });

  it("rejects missing credentials when configured", () => {
    expect(
      isBasicAuthAllowed(new Headers(), {
        APP_BASIC_AUTH_USER: "admin",
        APP_BASIC_AUTH_PASSWORD: "secret",
      }),
    ).toBe(false);
  });

  it("accepts matching basic auth credentials", () => {
    expect(
      isBasicAuthAllowed(
        new Headers({ authorization: authHeader("admin", "secret") }),
        {
          APP_BASIC_AUTH_USER: "admin",
          APP_BASIC_AUTH_PASSWORD: "secret",
        },
      ),
    ).toBe(true);
  });

  it("rejects non-matching basic auth credentials", () => {
    expect(
      isBasicAuthAllowed(
        new Headers({ authorization: authHeader("admin", "wrong") }),
        {
          APP_BASIC_AUTH_USER: "admin",
          APP_BASIC_AUTH_PASSWORD: "secret",
        },
      ),
    ).toBe(false);
  });
});
