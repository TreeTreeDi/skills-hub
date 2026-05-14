import { describe, it, expect } from "vite-plus/test";
import { apiConfig } from "./api-config.ts";

describe("apiConfig", () => {
  describe("trackInstallUrl", () => {
    it("returns the track-install endpoint URL", () => {
      expect(apiConfig.trackInstallUrl).toBe("https://skills-hub-website.vercel.app/api/track-install");
    });
  });
});
