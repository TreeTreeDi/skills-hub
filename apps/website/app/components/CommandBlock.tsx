"use client";

import { useState } from "react";

interface CommandBlockProps {
  command?: string;
}

export function CommandBlock({ command = "npx owl-skills add find-skills" }: CommandBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-primary rounded-sm px-4 py-5 flex items-center justify-between gap-4 w-full max-w-[380px]">
      <code className="font-mono text-sm text-on-primary truncate flex items-center">
        <span className="text-on-primary/50">$</span>
        <span className="ml-[1ch]">npx owl-skills add</span>
        <span className="text-on-primary/50 ml-[1ch]">find-skills</span>
      </code>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-sm cursor-pointer transition-colors text-on-primary/50 hover:text-on-primary shrink-0"
        title="Copy to clipboard"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <svg viewBox="0 0 16 16" height="16" width="16" className="h-4 w-4">
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" height="16" width="16" className="h-4 w-4">
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5zM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
