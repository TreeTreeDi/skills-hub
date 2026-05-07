import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { validateUploadDir } from "./upload.ts";

export interface UploadApiResult {
  success: boolean;
  prUrl?: string;
  skills?: Array<{ name: string; description: string }>;
  error?: string;
}

export interface UploadApiOptions {
  apiUrl?: string;
  uploaderName?: string;
  uploaderEmail?: string;
}

export async function createZip(dirPath: string): Promise<string> {
  const zipPath = join(tmpdir(), `owl-upload-${Date.now()}.zip`);
  const parentDir = dirname(dirPath);
  const dirName = basename(dirPath);
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

  const apiUrl = options.apiUrl ?? "https://skills-hub.vercel.app/api/upload";
  const formData = new FormData();
  formData.append("file", new Blob([zipBuffer]), "package.zip");
  formData.append("packageName", validation.packageName);
  if (options.uploaderName) formData.append("uploaderName", options.uploaderName);
  if (options.uploaderEmail) formData.append("uploaderEmail", options.uploaderEmail);

  try {
    const response = await fetch(apiUrl, { method: "POST", body: formData });
    if (!response.ok) {
      const body = await response.text();
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
