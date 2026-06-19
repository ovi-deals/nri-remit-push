"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Mail, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F8F7F4" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ background: "#E8751A" }}
          >₹</div>
          <span className="font-semibold text-lg" style={{ color: "#0F1F3D" }}>NRI Transfer</span>
        </div>

        <div className="rounded-2xl p-6" style={{ background: "#fff", border: "0.5px solid #E5E3DC" }}>

          {status === "sent" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#E8F5EE" }}>
                <CheckCircle2 size={24} color="#0A7C4E" />
              </div>
              <h2 className="font-semibold text-base mb-1" style={{ color: "#0F1F3D" }}>Check your inbox</h2>
              <p className="text-sm" style={{ color: "#64748B" }}>
                We sent a sign-in link to <span style={{ color: "#0F1F3D", fontWeight: 500 }}>{email}</span>. Tap it to continue — no password needed.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="text-sm mt-4 underline"
                style={{ color: "#64748B" }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-semibold text-lg mb-1" style={{ color: "#0F1F3D" }}>Sign in</h1>
              <p className="text-sm mb-5" style={{ color: "#64748B" }}>
                Save your alerts and transfer history. We&apos;ll email you a one-time link — no password to remember.
              </p>

              <form onSubmit={handleSubmit}>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
                  style={{ background: "#F8F7F4", border: "0.5px solid #E5E3DC" }}
                >
                  <Mail size={16} color="#94A3B8" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: "#0F1F3D" }}
                  />
                </div>

                {status === "error" && (
                  <p className="text-xs mb-3" style={{ color: "#DC2626" }}>{errorMsg || "Something went wrong. Try again."}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending" || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: "#0F1F3D" }}
                >
                  {status === "sending" ? (
                    <><Loader2 size={15} className="animate-spin" /> Sending link…</>
                  ) : (
                    <>Continue with email <ArrowRight size={15} /></>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "#94A3B8" }}>
          You can also <a href="/" className="underline">browse rates without signing in</a> — login is only needed to save alerts.
        </p>
      </div>
    </div>
  );
}
