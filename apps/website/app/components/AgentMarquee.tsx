const AGENTS = [
  { name: "Claude Code", icon: "/agents/claude-code.svg" },
  { name: "Cursor", icon: "/agents/cursor.svg" },
  { name: "Codex", icon: "/agents/codex.svg" },
  { name: "Copilot", icon: "/agents/copilot.svg" },
  { name: "Windsurf", icon: "/agents/windsurf.svg" },
  { name: "Gemini", icon: "/agents/gemini.svg" },
  { name: "Cline", icon: "/agents/cline.svg" },
  { name: "Amp", icon: "/agents/amp.svg" },
  { name: "Antigravity", icon: "/agents/antigravity.svg" },
  { name: "VS Code", icon: "/agents/vscode.svg" },
  { name: "Roo", icon: "/agents/roo.svg" },
  { name: "Trae", icon: "/agents/trae.svg" },
  { name: "Goose", icon: "/agents/goose.svg" },
  { name: "Droid", icon: "/agents/droid.svg" },
  { name: "Kilo", icon: "/agents/kilo.svg" },
  { name: "Opencode", icon: "/agents/opencode.svg" },
  { name: "Nous Research", icon: "/agents/nous-research.svg" },
  { name: "Kiro CLI", icon: "/agents/kiro-cli.svg" },
  { name: "Clawdbot", icon: "/agents/clawdbot.svg" },
];

export function AgentMarquee() {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <span className="font-mono text-xs uppercase tracking-wide text-slate">
        Available for these agents
      </span>
      <div className="relative overflow-hidden bg-soft-stone rounded-sm px-5 py-3.5">
        <div className="flex gap-4 animate-marquee">
          {AGENTS.map((agent) => (
            <div key={agent.name} className="flex items-center shrink-0" title={agent.name}>
              <img
                src={agent.icon}
                alt={agent.name}
                className="h-11 w-11"
                loading="lazy"
              />
            </div>
          ))}
          {/* Duplicate for seamless loop */}
          {AGENTS.map((agent) => (
            <div key={`${agent.name}-dup`} className="flex items-center shrink-0" title={agent.name}>
              <img
                src={agent.icon}
                alt={agent.name}
                className="h-11 w-11"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
