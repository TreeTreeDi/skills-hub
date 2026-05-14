import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { trackHubInstall } from "./telemetry.ts";
import { apiConfig } from "./api-config.ts";

describe("trackHubInstall", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("sends POST to trackInstallUrl with packageName", () => {
    trackHubInstall("hello");

    expect(fetchSpy).toHaveBeenCalledWith(
      apiConfig.trackInstallUrl,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: "hello" }),
      }),
    );
  });

  it("includes skillName when provided", () => {
    trackHubInstall("hello", "greet");

    expect(fetchSpy).toHaveBeenCalledWith(
      apiConfig.trackInstallUrl,
      expect.objectContaining({
        body: JSON.stringify({ packageName: "hello", skillName: "greet" }),
      }),
    );
  });

  it("silently ignores fetch rejection (offline)", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    // Should not throw
    trackHubInstall("hello");

    // Give microtask queue a chance to process the rejected promise
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it("silently ignores non-ok response", async () => {
    fetchSpy.mockResolvedValue(new Response("Not Found", { status: 404 }));

    trackHubInstall("hello");

    await new Promise((resolve) => setTimeout(resolve, 10));
  });
});
