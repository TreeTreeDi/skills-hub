import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { validateUploadDir } from "./upload.ts";
import { apiConfig } from "./api-config.ts";

export interface UploadApiResult {
  success: boolean;
  prUrl?: string;
  skills?: Array<{ name: string; description: string }>;
  error?: string;
}

export interface UploadApiOptions {
  uploaderName?: string;
  uploaderEmail?: string;
  packageName?: string;
}

export async function checkPackageExists(
  packageName: string,
): Promise<{ exists: boolean; error?: string }> {
  const url = new URL(apiConfig.checkPackageUrl);
  url.searchParams.set("packageName", packageName);
  try {
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) {
      const body = await response.text();
      return { exists: false, error: `API error (${response.status}): ${body}` };
    }
    const data = (await response.json()) as { exists: boolean };
    return { exists: data.exists };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function createZip(dirPath: string): Promise<string> {
  const resolved = resolve(dirPath);
  const zipPath = join(tmpdir(), `dt-skill-upload-${Date.now()}.zip`);
  const parentDir = dirname(resolved);
  const dirName = basename(resolved);
  await execPromise("zip", ["-r", zipPath, dirName], { cwd: parentDir });
  return zipPath;
}

export async function uploadToHub(
  dirPath: string,
  options: UploadApiOptions = {},
): Promise<UploadApiResult> {
  const validation = await validateUploadDir(dirPath);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const zipPath = await createZip(dirPath);
  const zipBuffer = await readFile(zipPath);

  const apiUrl = apiConfig.uploadUrl;
  const formData = new FormData();
  formData.append("file", new File([zipBuffer], "package.zip"), "package.zip");
  formData.append("packageName", options.packageName ?? validation.packageName);
  if (options.uploaderName) formData.append("uploaderName", options.uploaderName);
  if (options.uploaderEmail) formData.append("uploaderEmail", options.uploaderEmail);

  try {
    const response = await fetch(apiUrl, { method: "POST", body: formData });
    if (!response.ok) {
      const body = await response.text();
      if (response.status === 409) {
        try {
          const parsed = JSON.parse(body) as { error?: string };
          if (parsed.error) {
            return { success: false, error: parsed.error };
          }
        } catch {
          // fall through to generic error
        }
      }
      return { success: false, error: `API error (${response.status}): ${body}` };
    }
    const data = (await response.json()) as {
      prUrl: string;
      skills: Array<{ name: string; description: string }>;
    };
    return { success: true, prUrl: data.prUrl, skills: data.skills };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

function execPromise(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: options.cwd }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
