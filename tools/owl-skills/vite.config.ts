import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: [
      "src/cli.ts",
      "src/add.ts",
      "src/agents.ts",
      "src/blob.ts",
      "src/config.ts",
      "src/constants.ts",
      "src/find.ts",
      "src/frontmatter.ts",
      "src/git.ts",
      "src/install.ts",
      "src/installer.ts",
      "src/list.ts",
      "src/local-lock.ts",
      "src/plugin-manifest.ts",
      "src/remove.ts",
      "src/sanitize.ts",
      "src/skill-lock.ts",
      "src/skills.ts",
      "src/source-parser.ts",
      "src/sync.ts",
      "src/telemetry.ts",
      "src/types.ts",
      "src/update-source.ts",
      "src/upload.ts",
      "src/upload-api.ts",
      "src/providers/index.ts",
      "src/providers/registry.ts",
      "src/providers/types.ts",
      "src/providers/wellknown.ts",
      "src/prompts/search-multiselect.ts",
    ],
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
