"use client";

import { Bell, LogIn, LogOut } from "lucide-react";
import { useUser } from "@/lib/use-user";
import type { Alert } from "@/lib/use-alerts";

export default function SiteHeader({
  countryBadge,
  alerts,
  onBellClick,
}: {
  countryBadge: string;
  alerts: Alert[];
  onBellClick: () => void;
}) {
  const { user, loading: userLoading, signOut } = useUser();
  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <header style={{ background: "#0F1F3D" }} className="sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "#E8751A" }}>₹</div>
          <span className="text-white font-semibold text-sm">NRI Transfer</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(232,117,26,0.2)", color: "#FDDBB4" }}>
            {countryBadge}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E", animation: "pulse 2s infinite" }} />
            Live
          </div>
          <button onClick={onBellClick} className="relative p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
            <Bell size={16} color="#94A3B8" />
            {activeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center" style={{ background: "#E8751A", fontSize: 8 }}>
                {activeCount}
              </span>
            )}
          </button>
          {!userLoading && (
            user ? (
              <button onClick={signOut} title={user.email || "Signed in"} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
                <LogOut size={16} color="#94A3B8" />
              </button>
            ) : (
              <a href="/login" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "#E2E8F0" }}>
                <LogIn size={13} /> Sign in
              </a>
            )
          )}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}`}</style>
    </header>
  );
}
