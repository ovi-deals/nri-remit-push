"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Minus, Bell, Sparkles,
  ExternalLink, Clock, AlertCircle,
  CheckCircle2, X, Send, RefreshCw, Info, Star, LogIn, LogOut
} from "lucide-react";
import { useUser } from "@/lib/use-user";

// Affiliate links — fill these in once each provider's affiliate program
// approves you. Until then, these fall back to public homepages so the
// "Send" button never breaks; it just won't earn commission yet.
const AFFILIATE_LINKS: Record<string, string> = {
  wise: "https://wise.com/au/send-money/aud-to-inr/", // ?ref=YOURWISEID once approved
  remitly: "https://www.remitly.com/au/en",            // ?ref=YOURREMITLYID
  xe: "https://www.xe.com/xemoneytransfer/",            // ?ref=YOURXEID
  ofx: "https://www.ofx.com/en-au/",                    // ?ref=YOUROFXID
  instarem: "https://www.instarem.com/en-au/",          // ?ref=YOURINSTID
};

const LOGO: Record<string, string> = { wise: "W", remitly: "R", xe: "X", ofx: "O", instarem: "I" };
const BG: Record<string, string> = { wise: "#E6F1FB", remitly: "#EEEDFE", xe: "#FAEEDA", ofx: "#EAF3DE", instarem: "#FAECE7" };
const FG: Record<string, string> = { wise: "#0C447C", remitly: "#3C3489", xe: "#633806", ofx: "#27500A", instarem: "#712B13" };

interface RateData {
  id: string; name: string; rate: number; youSend: number; theyGet: number;
  rank: number; fee: number; feeType: string; speed: string; cookieDays: string; cpa: string;
  logo: string; color: string; bg: string; affiliateUrl: string;
}
interface RatesResponse {
  midMarketRate: number; avg30d: number; source: string; fetchedAt: string; amount: number;
  providers: Omit<RateData, "logo" | "color" | "bg" | "affiliateUrl">[];
}
interface Alert {
  id: string; type: "rate" | "reminder"; label: string;
  value?: number; active: boolean;
}
interface AIMessage { text: string; type: "tip" | "warning" | "good"; }

// Used only until the first real API response arrives (brand-new deployments
// with zero rate_snapshots rows yet). After that, the live avg30d from
// /api/rates always wins. Deliberately not "accurate" — just a placeholder.
const INITIAL_AVG_30D = 60.0;

function getTrend(r: number, avg: number) {
  if (r > avg + 0.25) return "above";
  if (r < avg - 0.25) return "below";
  return "neutral";
}

async function fetchLiveRates(amount: number): Promise<RatesResponse> {
  const res = await fetch(`/api/rates?amount=${amount}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch rates");
  return res.json();
}

function decorateProviders(data: RatesResponse): RateData[] {
  return data.providers.map((p) => ({
    ...p,
    logo: LOGO[p.id] || p.id[0].toUpperCase(),
    color: FG[p.id] || "#64748B",
    bg: BG[p.id] || "#F1F5F9",
    affiliateUrl: AFFILIATE_LINKS[p.id] || "#",
  }));
}

async function fetchAISuggestion(prompt: string, context?: Record<string, unknown>): Promise<string> {
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

function makeAIPrompt(amount: number, rates: RateData[], alerts: Alert[], avg30d: number): { prompt: string; context: Record<string, unknown> } {
  const best = rates[0];
  const trend = getTrend(best.rate, avg30d);
  const saving = best.theyGet - rates[rates.length - 1].theyGet;
  const hit = alerts.find(a => a.type === "rate" && a.value && best.rate >= a.value && a.active);

  const context = {
    amountAud: amount, bestProvider: best.name, bestRate: best.rate,
    avg30d, trend, savingVsWorst: saving,
    activeAlerts: alerts.filter(a => a.active).map(a => a.label),
  };

  if (hit) {
    return { prompt: `My rate alert for ${hit.value} just triggered — current rate is ${best.rate} via ${best.name}. Should I send now?`, context };
  }
  return { prompt: `I'm looking at sending A$${amount} to India right now. Best rate is ${best.rate} via ${best.name} (30-day avg ${avg30d}). Give me a quick read on timing.`, context };
}

function Sparkline({data,color}:{data:number[];color:string}) {
  const min=Math.min(...data), max=Math.max(...data), range=max-min||1;
  const w=80,h=28;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts}/>
      <circle cx={w} cy={h-((data[data.length-1]-min)/range)*h} r="2.5" fill={color}/>
    </svg>
  );
}

function MiniBar({value,max,color}:{value:number;max:number;color:string}) {
  const pct=Math.min(100,Math.round((value/max)*100));
  return (
    <div className="flex-1 h-1.5 rounded-full" style={{background:"#E5E3DC"}}>
      <div className="h-1.5 rounded-full transition-all duration-700" style={{width:`${pct}%`,background:color}}/>
    </div>
  );
}

// Splits the AI's bullet-formatted response into list items. Falls back to
// rendering the raw text as a single line if the model ever ignores the
// "• " formatting instruction (LLM output isn't 100% guaranteed even with
// a strict system prompt), so the UI never shows something broken/empty.
function parseBullets(text: string): string[] {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/^[•\-*]\s*/, ""));
  return lines.length > 0 ? lines : [text];
}

function AIBullets({text}:{text:string}) {
  const bullets = parseBullets(text);
  if (bullets.length === 1) {
    return <p className="text-sm leading-relaxed" style={{color:"#0F1F3D"}}>{bullets[0]}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {bullets.map((b,i)=>(
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{color:"#0F1F3D"}}>
          <span style={{color:"#E8751A",flexShrink:0,marginTop:1}}>•</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  const { user, loading: userLoading, signOut } = useUser();
  const [amount, setAmount] = useState(1000);
  const [rates, setRates] = useState<RateData[]>([]);
  const [aiMsg, setAiMsg] = useState<AIMessage|null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Default alerts shown for signed-out / first-time users. Once logged in,
  // these are replaced by whatever's saved in Supabase for that account.
  const [alerts, setAlerts] = useState<Alert[]>([
    {id:"a1",type:"rate",label:"Alert when AUD/INR > 68.00",value:68.0,active:true},
    {id:"a2",type:"reminder",label:"Monthly: ₹1,00,000 to parents on 1st",active:true},
  ]);
  const [showPanel, setShowPanel] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [newReminder, setNewReminder] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [toast, setToast] = useState<string|null>(null);
  const [clicked, setClicked] = useState<string|null>(null);
  const [rateHistory, setRateHistory] = useState<number[]>([]);
  const [avg30d, setAvg30d] = useState(INITIAL_AVG_30D);

  // Load this user's saved alerts once we know they're signed in
  useEffect(() => {
    if (!user) return;
    fetch("/api/alerts")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.alerts) {
          setAlerts(data.alerts.map((a: { id: string; type: string; label: string; threshold_rate: number | null; active: boolean }) => ({
            id: a.id,
            type: a.type === "rate" ? "rate" : "reminder",
            label: a.label,
            value: a.threshold_rate ?? undefined,
            active: a.active,
          })));
        }
      })
      .catch(() => {/* keep local defaults if the fetch fails */});
  }, [user]);

  const refresh = useCallback(async (amt=amount) => {
    setRefreshing(true);
    try {
      const data = await fetchLiveRates(amt);
      const nr = decorateProviders(data);
      setRates(nr);
      setLastUpdated(new Date());
      setRefreshing(false);
      setRateHistory(prev => [...prev, nr[0].rate].slice(-8));
      const liveAvg = data.avg30d ?? nr[0].rate;
      setAvg30d(liveAvg);

      setAiLoading(true);
      const { prompt, context } = makeAIPrompt(amt, nr, alerts, liveAvg);
      const text = await fetchAISuggestion(prompt, context);
      const trend = getTrend(nr[0].rate, liveAvg);
      setAiMsg({ text, type: trend === "above" ? "good" : trend === "below" ? "warning" : "tip" });
      setAiLoading(false);
    } catch {
      setRefreshing(false);
      setAiLoading(false);
      setAiMsg({ text: "Couldn't reach live rates right now — check your connection and try again.", type: "warning" });
    }
  },[amount,alerts]);

  useEffect(()=>{refresh(1000);},[]);

  // Re-fetch rates (not just AI) when amount changes, since fees scale differently per provider
  useEffect(()=>{
    const t=setTimeout(()=>{refresh(amount);},400);
    return()=>clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[amount]);

  useEffect(()=>{const iv=setInterval(()=>refresh(),60000);return()=>clearInterval(iv);},[refresh]);

  const changeAmount = (v:number) => {setAmount(v);};

  const sendClick = async (p:RateData) => {
    setClicked(p.id);
    setToast(`Opening ${p.name}…`);

    // Log the click for affiliate analytics (fire-and-forget, never blocks navigation)
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: p.id, amount_sent: p.youSend, rate_used: p.rate }),
    }).catch(()=>{});

    window.open(p.affiliateUrl, "_blank");
    setTimeout(()=>{setToast(null);setClicked(null);},3000);
  };

  const addRateAlert = async () => {
    const v=parseFloat(newRate); if(!v) return;
    const label = `Alert when AUD/INR > ${v.toFixed(2)}`;
    const localId = Date.now().toString();
    setAlerts(prev=>[...prev,{id:localId,type:"rate",label,value:v,active:true}]);
    setNewRate("");

    if (user) {
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "rate", label, threshold_rate: v }),
        });
        const data = await res.json();
        if (data?.alert?.id) {
          // swap the temp local id for the real Supabase row id
          setAlerts(prev => prev.map(a => a.id === localId ? { ...a, id: data.alert.id } : a));
        }
      } catch {/* keep the local-only alert if the save fails */}
    }
  };
  const addReminder = async () => {
    if(!newReminder.trim()) return;
    const label = newReminder;
    const localId = Date.now().toString();
    setAlerts(prev=>[...prev,{id:localId,type:"reminder",label,active:true}]);
    setNewReminder("");

    if (user) {
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "custom", label }),
        });
        const data = await res.json();
        if (data?.alert?.id) {
          setAlerts(prev => prev.map(a => a.id === localId ? { ...a, id: data.alert.id } : a));
        }
      } catch {/* keep the local-only alert if the save fails */}
    }
  };
  const toggleAlert = (id:string) => {
    setAlerts(prev=>prev.map(a=>a.id===id?{...a,active:!a.active}:a));
    if (user) {
      const current = alerts.find(a => a.id === id);
      fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !current?.active }),
      }).catch(()=>{});
    }
  };
  const removeAlert = (id:string) => {
    setAlerts(prev=>prev.filter(a=>a.id!==id));
    if (user) {
      fetch(`/api/alerts?id=${id}`, { method: "DELETE" }).catch(()=>{});
    }
  };

  const best = rates[0];
  const trend = best ? getTrend(best.rate, avg30d) : "neutral";
  const maxGet = best?.theyGet ?? 1;

  return (
    <div className="min-h-screen" style={{background:"#F8F7F4"}}>

      {/* Header */}
      <header style={{background:"#0F1F3D"}} className="sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{background:"#E8751A"}}>₹</div>
            <span className="text-white font-semibold text-sm">NRI Remit</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:"rgba(232,117,26,0.2)",color:"#FDDBB4"}}>AUS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs" style={{color:"#94A3B8"}}>
              <div className="w-1.5 h-1.5 rounded-full" style={{background:"#22C55E",animation:"pulse 2s infinite"}}/>
              Live
            </div>
            <button onClick={()=>setShowPanel(true)} className="relative p-1.5 rounded-lg" style={{background:"rgba(255,255,255,0.06)"}}>
              <Bell size={16} color="#94A3B8"/>
              {alerts.filter(a=>a.active).length>0&&(
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center" style={{background:"#E8751A",fontSize:8}}>
                  {alerts.filter(a=>a.active).length}
                </span>
              )}
            </button>
            {!userLoading && (
              user ? (
                <button onClick={signOut} title={user.email||"Signed in"} className="p-1.5 rounded-lg" style={{background:"rgba(255,255,255,0.06)"}}>
                  <LogOut size={16} color="#94A3B8"/>
                </button>
              ) : (
                <a href="/login" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{background:"rgba(255,255,255,0.06)",color:"#E2E8F0"}}>
                  <LogIn size={13}/> Sign in
                </a>
              )
            )}
          </div>
        </div>
        {/* ticker */}
        <div className="overflow-hidden" style={{borderTop:"0.5px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.03)"}}>
          <div className="flex whitespace-nowrap py-1.5" style={{animation:"ticker 22s linear infinite"}}>
            {rates.length>0 && [...rates,...rates].map((p,i)=>(
              <span key={i} className="mx-4 flex items-center gap-1.5 text-xs">
                <span style={{color:"#94A3B8"}}>{p.name}</span>
                <span style={{color:"#E2E8F0"}}>{p.rate.toFixed(2)}</span>
                <span style={{color:p.rate>=avg30d?"#22C55E":"#F87171",fontSize:10}}>{p.rate>=avg30d?"▲":"▼"}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Amount Card */}
        <div className="rounded-2xl p-5" style={{background:"#fff",border:"0.5px solid #E5E3DC"}}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{color:"#64748B",letterSpacing:"0.08em"}}>You send</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold" style={{color:"#0F1F3D",letterSpacing:"-0.02em"}}>A$</span>
                <input type="number" value={amount}
                  onChange={e=>changeAmount(Math.max(50,parseInt(e.target.value)||0))}
                  className="text-3xl font-bold border-none outline-none w-28"
                  style={{color:"#0F1F3D",letterSpacing:"-0.02em",background:"transparent"}}/>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{color:"#64748B",letterSpacing:"0.08em"}}>Best gets</p>
              <p className="text-2xl font-bold" style={{color:"#0A7C4E",letterSpacing:"-0.02em"}}>
                {best?`₹${best.theyGet.toLocaleString("en-IN")}`:"—"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {[500,1000,2000,5000].map(v=>(
              <button key={v} onClick={()=>changeAmount(v)}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{background:amount===v?"#0F1F3D":"#F8F7F4",color:amount===v?"#fff":"#64748B",border:`0.5px solid ${amount===v?"#0F1F3D":"#E5E3DC"}`}}>
                A${v.toLocaleString()}
              </button>
            ))}
          </div>

          <input type="range" min={50} max={10000} step={50} value={amount}
            onChange={e=>changeAmount(parseInt(e.target.value))}
            className="amount-slider w-full"/>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {trend==="above"?<TrendingUp size={13} color="#0A7C4E"/>:
               trend==="below"?<TrendingDown size={13} color="#DC2626"/>:
               <Minus size={13} color="#64748B"/>}
              <span className="text-xs" style={{color:"#64748B"}}>
                {trend==="above"?`${((best?.rate??0)-avg30d).toFixed(2)} above 30-day avg (${avg30d})`:
                 trend==="below"?`${(avg30d-(best?.rate??0)).toFixed(2)} below 30-day avg (${avg30d})`:
                 `Near 30-day average of ${avg30d}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkline data={rateHistory.length>1?rateHistory:[best?.rate??avg30d,best?.rate??avg30d]} color={trend==="above"?"#0A7C4E":trend==="below"?"#DC2626":"#64748B"}/>
              <button onClick={()=>refresh()} className="p-1 rounded-lg" style={{background:"#F8F7F4"}}>
                <RefreshCw size={12} color="#64748B" style={{animation:refreshing?"spin 1s linear infinite":""}}/>
              </button>
            </div>
          </div>
          <p className="text-xs mt-1" style={{color:"#94A3B8"}}>
            Updated {lastUpdated.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"})} · auto-refreshes every 30s
          </p>
        </div>

        {/* AI Card */}
        <div className="rounded-2xl p-4" style={{background:"#fff",border:"0.5px solid #FDDBB4",boxShadow:"0 0 0 1px rgba(232,117,26,0.15),0 4px 20px rgba(232,117,26,0.06)"}}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:"#FEF3E8"}}>
              <Sparkles size={15} color="#E8751A"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold" style={{color:"#E8751A"}}>AI Rate Advisor</span>
                {aiLoading&&<div className="flex gap-0.5">{[0,1,2].map(i=>(
                  <div key={i} className="w-1 h-1 rounded-full" style={{background:"#FDDBB4",animation:`pulse ${0.6+i*0.15}s ease-in-out infinite`}}/>
                ))}</div>}
              </div>
              {aiLoading?(
                <div className="space-y-1.5">
                  <div className="h-3 rounded-md animate-pulse" style={{background:"#FEF3E8",width:"80%"}}/>
                  <div className="h-3 rounded-md animate-pulse" style={{background:"#FEF3E8",width:"60%"}}/>
                </div>
              ):(
                aiMsg?.text ? <AIBullets text={aiMsg.text}/> : null
              )}
            </div>
            <div className="flex-shrink-0 mt-0.5">
              {aiMsg?.type==="good"&&<CheckCircle2 size={14} color="#0A7C4E"/>}
              {aiMsg?.type==="warning"&&<AlertCircle size={14} color="#DC2626"/>}
              {aiMsg?.type==="tip"&&<Info size={14} color="#E8751A"/>}
            </div>
          </div>
          {alerts.filter(a=>a.active).length>0&&(
            <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{borderTop:"0.5px solid #FEF3E8"}}>
              {alerts.filter(a=>a.active).map(a=>(
                <span key={a.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{background:a.type==="rate"?"#E8F5EE":"#FEF3E8",color:a.type==="rate"?"#0A7C4E":"#7C3C0A"}}>
                  {a.type==="rate"?<TrendingUp size={10}/>:<Bell size={10}/>}
                  {a.label}
                </span>
              ))}
              <button onClick={()=>setShowPanel(true)} className="text-xs px-2.5 py-1 rounded-full"
                style={{background:"#F8F7F4",color:"#64748B",border:"0.5px solid #E5E3DC"}}>
                + Add alert
              </button>
            </div>
          )}
        </div>

        {/* Rate List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{color:"#0F1F3D"}}>Live rates — {rates.length} providers</h2>
            <span className="text-xs" style={{color:"#64748B"}}>A${amount.toLocaleString()} → INR</span>
          </div>
          <div className="space-y-2">
            {rates.map(p=>(
              <div key={p.id} className="rounded-2xl p-4 transition-all"
                style={{background:"#fff",border:`0.5px solid ${p.rank===1?"#0A7C4E":"#E5E3DC"}`}}>
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                      style={{background:p.bg,color:p.color,fontSize:15}}>{p.logo}</div>
                    {p.rank===1&&(
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{background:"#0A7C4E"}}>
                        <Star size={8} color="#fff" fill="#fff"/>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{color:"#0F1F3D"}}>{p.name}</span>
                        {p.rank===1&&<span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:"#E8F5EE",color:"#0A7C4E"}}>Best</span>}
                        {p.rank===rates.length&&<span className="text-xs px-2 py-0.5 rounded-full" style={{background:"#F8F7F4",color:"#94A3B8"}}>Lowest</span>}
                      </div>
                      <span className="font-bold text-base" style={{color:p.rank===1?"#0A7C4E":"#0F1F3D"}}>
                        ₹{p.theyGet.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <MiniBar value={p.theyGet} max={maxGet} color={p.rank===1?"#0A7C4E":"#CBD5E1"}/>
                      <span className="text-xs flex-shrink-0" style={{color:p.rank===1?"#0A7C4E":"#94A3B8"}}>
                        {p.rank===1?"▲ best":p.rank===2?`-₹${(best?.theyGet-p.theyGet).toLocaleString()}`:`-₹${(best?.theyGet-p.theyGet).toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs" style={{color:"#64748B"}}>
                        <span>{p.rate.toFixed(2)}/AUD</span>
                        <span className="flex items-center gap-1"><Clock size={10}/>{p.speed}</span>
                        <span>{p.fee>0?`A$${p.fee} fee`:"No fee"}</span>
                      </div>
                      <button onClick={()=>sendClick(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                        style={{
                          background:clicked===p.id?"#0A7C4E":p.rank===1?"#0F1F3D":"#F8F7F4",
                          color:p.rank===1||clicked===p.id?"#fff":"#0F1F3D",
                          border:`0.5px solid ${p.rank===1?"#0F1F3D":"#E5E3DC"}`
                        }}>
                        {clicked===p.id?<><CheckCircle2 size={11}/>Opening</>:<>Send <ExternalLink size={11}/></>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs pb-6" style={{color:"#94A3B8"}}>
          Rates are indicative, updated every 30 seconds. "Send" buttons use affiliate links — we may earn a commission at no cost to you.
        </p>
      </main>

      {/* Alert Panel */}
      {showPanel&&(
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{background:"rgba(15,31,61,0.55)",backdropFilter:"blur(4px)"}}
          onClick={e=>e.target===e.currentTarget&&setShowPanel(false)}>
          <div className="w-full max-w-2xl rounded-t-3xl p-6" style={{background:"#fff",maxHeight:"85vh",overflowY:"auto"}}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-base" style={{color:"#0F1F3D"}}>Alerts & Reminders</h3>
                <p className="text-xs mt-0.5" style={{color:"#64748B"}}>AI checks these every time rates refresh</p>
              </div>
              <button onClick={()=>setShowPanel(false)} className="p-2 rounded-xl" style={{background:"#F8F7F4"}}>
                <X size={16} color="#64748B"/>
              </button>
            </div>

            <div className="space-y-2 mb-5">
              {alerts.map(a=>(
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{background:"#F8F7F4",border:"0.5px solid #E5E3DC"}}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{background:a.type==="rate"?"#E8F5EE":"#FEF3E8"}}>
                    {a.type==="rate"?<TrendingUp size={14} color="#0A7C4E"/>:<Bell size={14} color="#E8751A"/>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{color:"#0F1F3D"}}>{a.label}</p>
                    <p className="text-xs" style={{color:"#64748B"}}>{a.type==="rate"?"Rate alert":"Monthly reminder"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>toggleAlert(a.id)}
                      className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all"
                      style={{background:a.active?"#0A7C4E":"#CBD5E1"}}>
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                        style={{transform:a.active?"translateX(20px)":"translateX(0)"}}/>
                    </button>
                    <button onClick={()=>removeAlert(a.id)} className="p-1">
                      <X size={12} color="#94A3B8"/>
                    </button>
                  </div>
                </div>
              ))}
              {alerts.length===0&&<p className="text-sm text-center py-4" style={{color:"#94A3B8"}}>No alerts yet</p>}
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{color:"#64748B"}}>Add rate alert</p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{background:"#F8F7F4",border:"0.5px solid #E5E3DC"}}>
                  <span className="text-sm text-nowrap" style={{color:"#64748B"}}>Notify when &gt;</span>
                  <input type="number" placeholder="56.00" value={newRate}
                    onChange={e=>setNewRate(e.target.value)}
                    className="flex-1 border-none outline-none text-sm font-semibold bg-transparent"
                    style={{color:"#0F1F3D"}}/>
                </div>
                <button onClick={addRateAlert} className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
                  style={{background:"#0F1F3D"}}>Add</button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{color:"#64748B"}}>Add monthly reminder</p>
              <div className="flex gap-2">
                <input type="text" placeholder="e.g. Send ₹50,000 to parents on 1st"
                  value={newReminder} onChange={e=>setNewReminder(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addReminder()}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{background:"#F8F7F4",border:"0.5px solid #E5E3DC",color:"#0F1F3D"}}/>
                <button onClick={addReminder}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5"
                  style={{background:"#E8751A"}}>
                  <Send size={13}/>Set
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl flex items-start gap-2"
              style={{background:"#FEF3E8",border:"0.5px solid #FDDBB4"}}>
              <Sparkles size={13} color="#E8751A" style={{marginTop:2,flexShrink:0}}/>
              <p className="text-xs leading-relaxed" style={{color:"#7C3C0A"}}>
                The AI advisor checks your active alerts every 30 seconds and surfaces a contextual message at the top of the screen when a rate or reminder is triggered.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast&&(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg"
            style={{background:"#0F1F3D",color:"#fff"}}>
            <ExternalLink size={14}/><span className="text-sm font-medium">{toast}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
