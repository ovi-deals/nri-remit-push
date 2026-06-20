import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CORRIDORS, getCorridorBySlug, getAllCorridorSlugs } from "@/lib/corridors";
import CorridorRateWidget from "@/app/components/CorridorRateWidget";
import CorridorConfirmBanner from "@/app/components/CorridorConfirmBanner";
import CorridorHeaderAndAlerts from "@/app/components/CorridorHeaderAndAlerts";

// Sensible "alert me if it goes above this" starting point per currency —
// roughly current-ish levels, just enough to pre-fill the alert form with
// something reasonable rather than an empty/zero default.
const DEFAULT_ALERT_THRESHOLD: Record<string, number> = {
  AUD: 68.0, USD: 89.0, GBP: 113.0, CAD: 64.0, AED: 24.5, SGD: 66.0,
};

// Pre-render every corridor at build time — this is what makes each one a
// real, independently indexable static page rather than something only
// assembled client-side after JS runs.
export function generateStaticParams() {
  return getAllCorridorSlugs().map((slug) => ({ corridor: slug }));
}

type Params = Promise<{ corridor: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { corridor: slug } = await params;
  const corridor = getCorridorBySlug(slug);
  if (!corridor) return { title: "Corridor not found" };

  return {
    title: corridor.metaTitle,
    description: corridor.metaDescription,
    alternates: { canonical: `/send-money/${corridor.slug}` },
    openGraph: {
      title: corridor.metaTitle,
      description: corridor.metaDescription,
      type: "website",
    },
  };
}

export default async function CorridorPage({ params }: { params: Params }) {
  const { corridor: slug } = await params;
  const corridor = getCorridorBySlug(slug);
  if (!corridor) notFound();

  return (
    <div className="min-h-screen" style={{ background: "#F8F7F4" }}>
      <CorridorHeaderAndAlerts
        countryCode={corridor.countryCode}
        currency={corridor.currency}
        defaultThreshold={DEFAULT_ALERT_THRESHOLD[corridor.currency] ?? 80.0}
      />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Breadcrumb-ish back link — helps both users and crawlers understand site structure */}
        <Link href="/" className="text-xs font-medium mb-4 inline-block" style={{ color: "#64748B" }}>
          ← All corridors
        </Link>

        <header className="mb-6">
          <p className="text-sm font-semibold mb-1" style={{ color: "#E8751A" }}>
            {corridor.flag} {corridor.countryName} → 🇮🇳 India
          </p>
          <h1 className="text-2xl font-bold mb-3" style={{ color: "#0F1F3D" }}>
            {corridor.h1}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
            {corridor.intro}
          </p>
        </header>

        {/* Lets a visitor whose detected country doesn't match this page's
            corridor jump to the right one instead of comparing rates that don't apply */}
        <CorridorConfirmBanner currentSlug={corridor.slug} />

        {/* Interactive comparison — the actual product, embedded as a client island.
            Suspense is required here because the widget reads useSearchParams()
            (to respect a ?currency= override) — wrapping it keeps everything else
            on this page statically prerendered at build time. */}
        <section className="mb-8">
          <Suspense fallback={<RateWidgetSkeleton />}>
            <CorridorRateWidget corridor={corridor} />
          </Suspense>
        </section>

        {/* Real indexable content below the tool — this is what search engines
            actually rank on for informational queries leading up to a transfer */}
        {corridor.localNotes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold mb-3" style={{ color: "#0F1F3D" }}>
              Good to know for {corridor.countryName}
            </h2>
            <ul className="space-y-2">
              {corridor.localNotes.map((note, i) => (
                <li key={i} className="text-sm leading-relaxed flex items-start gap-2" style={{ color: "#475569" }}>
                  <span style={{ color: "#E8751A" }}>•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3" style={{ color: "#0F1F3D" }}>
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {corridor.faqs.map((faq, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold mb-1" style={{ color: "#0F1F3D" }}>{faq.q}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>{faq.a}</p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4" style={{ color: "#94A3B8" }}>
            This is general information, not financial, tax, or legal advice. Speak with a qualified professional about your specific situation.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3" style={{ color: "#0F1F3D" }}>
            Other corridors
          </h2>
          <div className="flex flex-wrap gap-2">
            {CORRIDORS.filter((c) => c.slug !== corridor.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/send-money/${c.slug}`}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: "#fff", border: "0.5px solid #E5E3DC", color: "#475569" }}
              >
                {c.flag} {c.countryName} → India
              </Link>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs pt-4" style={{ color: "#94A3B8" }}>
          NRI Transfer · {corridor.nriPopulation} NRIs in {corridor.countryName} ({corridor.nriPopulationSource})
        </footer>
      </div>
    </div>
  );
}

function RateWidgetSkeleton() {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: "0.5px solid #E5E3DC" }}>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#F8F7F4" }} />
        ))}
      </div>
    </div>
  );
}
