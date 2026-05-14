"use client";

import { useState } from "react";

interface CommandBlockProps {
  command?: string;
}

export function CommandBlock({ command = "npx dt-skills add find-skills" }: CommandBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2.5 bg-white border border-hairline-warm rounded-xl px-3.5 py-2.5 w-full max-w-[380px] transition-shadow focus-within:shadow-[0_0_0_1px_var(--ring-warm)]">
      <code className="font-mono text-sm text-ink truncate flex-1">
        <span className="text-slate">$</span>
        <span className="ml-[1ch]">{command}</span>
      </code>
      <button
        onClick={handleCopy}
        className="p-1 rounded-md cursor-pointer transition-colors text-slate hover:text-ink shrink-0"
        title="复制到剪贴板"
        aria-label="复制到剪贴板"
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
          <svg viewBox="0 0 24 24" height="16" width="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
