"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin } from "lucide-react";
import { CORRIDORS } from "@/lib/corridors";
import { useDetectedCorridor } from "@/lib/use-detected-corridor";

// Shown on any corridor page (including the AU-specific homepage) so
// visitors detected as being from a DIFFERENT country get steered to their
// own corridor page instead of silently seeing rates that don't apply.
export default function CorridorConfirmBanner({ currentSlug = "australia-to-india" }: { currentSlug?: string }) {
  const { corridor, status, overrideCorridor } = useDetectedCorridor();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (dismissed || status === "detecting" || status === "unknown") return null;

  // Detected (or overridden) country already matches the page we're on — nothing to confirm.
  if (corridor?.slug === currentSlug) return null;

  const currentCorridor = CORRIDORS.find((c) => c.slug === currentSlug);

  // Detected a country we don't have a corridor page for yet — gently invite manual selection
  // instead of silently showing rates that don't apply.
  if (status === "unsupported" || (status === "detected" && corridor)) {
    return (
      <div
        className="rounded-2xl p-4 mb-4 flex items-start gap-3"
        style={{ background: "#FEF3E8", border: "0.5px solid #FDDBB4" }}
      >
        <MapPin size={16} style={{ color: "#E8751A", marginTop: 2, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          {corridor ? (
            <>
              <p className="text-sm font-medium mb-2" style={{ color: "#0F1F3D" }}>
                Looks like you might be sending from {corridor.countryName}, not {currentCorridor?.countryName ?? "here"}.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => router.push(`/send-money/${corridor.slug}`)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                  style={{ background: "#0F1F3D", color: "#fff" }}
                >
                  Go to {corridor.countryName} rates
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl"
                  style={{ background: "transparent", color: "#64748B" }}
                >
                  Stay on this page
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm font-medium mb-2" style={{ color: "#0F1F3D" }}>
              We don&apos;t have a dedicated page for your country yet — pick the closest match below, or stay here.
            </p>
          )}

          <div className="relative mt-2">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: "#E8751A" }}
            >
              Choose a different country <ChevronDown size={12} />
            </button>
            {pickerOpen && (
              <div
                className="absolute z-10 mt-1 rounded-xl overflow-hidden shadow-lg"
                style={{ background: "#fff", border: "0.5px solid #E5E3DC", minWidth: 200 }}
              >
                {CORRIDORS.map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => {
                      overrideCorridor(c.slug);
                      setPickerOpen(false);
                      if (c.slug !== currentSlug) router.push(`/send-money/${c.slug}`);
                    }}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50"
                    style={{ color: "#0F1F3D" }}
                  >
                    {c.flag} {c.countryName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
