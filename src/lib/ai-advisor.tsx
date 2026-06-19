"use client";

import React from "react";

export async function fetchAISuggestion(prompt: string, context?: Record<string, unknown>): Promise<string> {
  const res = await fetch("/api/ai-suggestion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, context }),
  });
  const data = await res.json();
  if (!res.ok) {
    return data.message || "AI suggestions need a Cloudflare Worker or API key configured. See README.";
  }
  return data.message;
}

// Splits the AI's bullet-formatted response into list items. Falls back to
// rendering the raw text as a single line if the model ever ignores the
// "• " formatting instruction (LLM output isn't 100% guaranteed even with
// a strict system prompt), so the UI never shows something broken/empty.
export function parseBullets(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[•\-*]\s*/, ""));
  return lines.length > 0 ? lines : [text];
}

export function AIBullets({ text, bulletColor = "#E8751A", textColor = "#0F1F3D" }: { text: string; bulletColor?: string; textColor?: string }) {
  const bullets = parseBullets(text);
  if (bullets.length === 1) {
    return <p className="text-sm leading-relaxed" style={{ color: textColor }}>{bullets[0]}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: textColor }}>
          <span style={{ color: bulletColor, flexShrink: 0, marginTop: 1 }}>•</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}
