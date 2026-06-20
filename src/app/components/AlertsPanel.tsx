"use client";

import { useState } from "react";
import { Bell, TrendingUp, X, Send, Sparkles } from "lucide-react";
import type { Alert } from "@/lib/use-alerts";
import PushNotificationToggle from "@/app/components/PushNotificationToggle";

export default function AlertsPanel({
  open,
  onClose,
  alerts,
  currency,
  isSignedIn,
  onAddRateAlert,
  onAddReminder,
  onToggleAlert,
  onRemoveAlert,
}: {
  open: boolean;
  onClose: () => void;
  alerts: Alert[];
  currency: string;
  isSignedIn: boolean;
  onAddRateAlert: (value: number) => void;
  onAddReminder: (text: string) => void;
  onToggleAlert: (id: string) => void;
  onRemoveAlert: (id: string) => void;
}) {
  const [newRate, setNewRate] = useState("");
  const [newReminder, setNewReminder] = useState("");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(15,31,61,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-t-3xl p-6" style={{ background: "#fff", maxHeight: "85vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-base" style={{ color: "#0F1F3D" }}>Alerts & Reminders</h3>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>AI checks these every time rates refresh</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: "#F8F7F4" }}>
            <X size={16} color="#64748B" />
          </button>
        </div>

        {isSignedIn ? (
          <div className="mb-5">
            <PushNotificationToggle />
            <p className="text-xs mt-1.5" style={{ color: "#94A3B8" }}>
              Alerts are also checked once a day automatically and sent by email if push isn&apos;t available on your device.
            </p>
          </div>
        ) : (
          <p className="text-xs mb-5 px-3 py-2.5 rounded-xl" style={{ color: "#64748B", background: "#F8F7F4" }}>
            Sign in to get notified by push or email when your alerts trigger — not just while this tab is open.
          </p>
        )}

        <div className="space-y-2 mb-5">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F8F7F4", border: "0.5px solid #E5E3DC" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: a.type === "rate" ? "#E8F5EE" : "#FEF3E8" }}>
                {a.type === "rate" ? <TrendingUp size={14} color="#0A7C4E" /> : <Bell size={14} color="#E8751A" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "#0F1F3D" }}>{a.label}</p>
                <p className="text-xs" style={{ color: "#64748B" }}>{a.type === "rate" ? "Rate alert" : "Monthly reminder"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleAlert(a.id)}
                  className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all"
                  style={{ background: a.active ? "#0A7C4E" : "#CBD5E1" }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform" style={{ transform: a.active ? "translateX(20px)" : "translateX(0)" }} />
                </button>
                <button onClick={() => onRemoveAlert(a.id)} className="p-1">
                  <X size={12} color="#94A3B8" />
                </button>
              </div>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-sm text-center py-4" style={{ color: "#94A3B8" }}>No alerts yet</p>}
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>Add rate alert</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#F8F7F4", border: "0.5px solid #E5E3DC" }}>
              <span className="text-sm text-nowrap" style={{ color: "#64748B" }}>Notify when {currency} &gt;</span>
              <input
                type="number"
                placeholder="68.00"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="flex-1 border-none outline-none text-sm font-semibold bg-transparent"
                style={{ color: "#0F1F3D" }}
              />
            </div>
            <button
              onClick={() => {
                const v = parseFloat(newRate);
                if (v) {
                  onAddRateAlert(v);
                  setNewRate("");
                }
              }}
              className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: "#0F1F3D" }}
            >
              Add
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>Add monthly reminder</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Send ₹50,000 to parents on 1st"
              value={newReminder}
              onChange={(e) => setNewReminder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newReminder.trim()) {
                  onAddReminder(newReminder);
                  setNewReminder("");
                }
              }}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "#F8F7F4", border: "0.5px solid #E5E3DC", color: "#0F1F3D" }}
            />
            <button
              onClick={() => {
                if (newReminder.trim()) {
                  onAddReminder(newReminder);
                  setNewReminder("");
                }
              }}
              className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5"
              style={{ background: "#E8751A" }}
            >
              <Send size={13} />Set
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "#FEF3E8", border: "0.5px solid #FDDBB4" }}>
          <Sparkles size={13} color="#E8751A" style={{ marginTop: 2, flexShrink: 0 }} />
          <p className="text-xs leading-relaxed" style={{ color: "#7C3C0A" }}>
            The AI advisor checks your active alerts every time rates refresh and surfaces a contextual message when a rate or reminder is triggered. Rate alerts are also checked once daily even when you&apos;re not on the site, and can notify you by push or email.
          </p>
        </div>
      </div>
    </div>
  );
}
