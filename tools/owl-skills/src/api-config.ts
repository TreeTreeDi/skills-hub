/**
 * Central API endpoint configuration.
 *
 * All API calls in the CLI go through this module. The base URL can be
 * overridden via the SKILLS_API_URL environment variable, making it easy
 * to point the entire CLI at a local dev server.
 */

// TODO； 这里可以处理
const DEFAULT_BASE_URL = "https://skills.sh";
const DEFAULT_UPLOAD_BASE = "https://skills-hub-website.vercel.app";

/** Resolve the effective base URL from env / CLI override */
function resolveBaseUrl(): string {
  // SKILLS_API_URL overrides everything
  if (process.env.SKILLS_API_URL) {
    return process.env.SKILLS_API_URL.replace(/\/$/, "");
  }
  return DEFAULT_BASE_URL;
}

/** Resolve the upload-specific base URL */
function resolveUploadBaseUrl(): string {
  if (process.env.SKILLS_API_URL) {
    return process.env.SKILLS_API_URL.replace(/\/$/, "");
  }
  return DEFAULT_UPLOAD_BASE;
}

export const apiConfig = {
  get baseUrl() {
    return resolveBaseUrl();
  },

  get uploadUrl() {
    return `${resolveUploadBaseUrl()}/api/upload`;
  },

  get amendUrl() {
    return `${resolveUploadBaseUrl()}/api/amend`;
  },

  get checkPackageUrl() {
    return `${resolveUploadBaseUrl()}/api/upload/check`;
  },

  get searchUrl() {
    return `${resolveBaseUrl()}/api/search`;
  },

  downloadUrl(owner: string, repo: string, slug: string) {
    return `${resolveBaseUrl()}/api/download/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(slug)}`;
  },
} as const;
