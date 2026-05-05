"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded-sm border border-hairline px-3 py-1.5 font-mono text-xs text-muted hover:text-ink hover:border-ink transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
