// ═══════════════════════════════════════════════════════════════════════════
// Corridor data — one entry per source-country-to-India remittance corridor.
//
// Each corridor gets its own indexable URL: /send-money/[slug]
// (e.g. /send-money/uae-to-india, /send-money/usa-to-india)
//
// This is intentionally NOT a find-and-replace template. Real providers,
// real currency, real context differ meaningfully by corridor — see the
// README note at the bottom for what's been verified vs estimated.
// ═══════════════════════════════════════════════════════════════════════════

export interface CorridorProvider {
  id: string;
  name: string;
  note: string; // one corridor-specific differentiator, not generic copy
}

export interface Corridor {
  slug: string;                  // URL segment, e.g. "uae-to-india"
  countryCode: string;           // ISO 3166-1 alpha-2, matches Vercel geo header
  countryName: string;
  flag: string;                  // emoji flag for quick visual scan
  currency: string;              // ISO 4217 code, e.g. "AED"
  currencySymbol: string;
  nriPopulation: string;         // headline stat for intro copy, sourced
  nriPopulationSource: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;                 // 2-3 sentences, corridor-specific
  providers: CorridorProvider[]; // ordered by relevance to THIS corridor
  faqs: { q: string; a: string }[];
  localNotes: string[];          // corridor-specific facts (FEMA applies to all, but local context differs)
  howItWorks: string[];          // 3-4 step explainer, matches the pattern most competitor sites use
}

export const CORRIDORS: Corridor[] = [
  {
    slug: "australia-to-india",
    countryCode: "AU",
    countryName: "Australia",
    flag: "🇦🇺",
    currency: "AUD",
    currencySymbol: "A$",
    nriPopulation: "780,000+",
    nriPopulationSource: "Estimate based on 2021 Australian Census Indian-ancestry data",
    metaTitle: "Compare Rates to India from Australia — AUD to INR Money Transfer",
    metaDescription: "Compare live rates to India from Australia across Wise, Remitly, XE, OFX and Instarem. See the best AUD to INR exchange rate today before you transfer.",
    h1: "Send money to India from Australia",
    intro: "Australia is home to one of the fastest-growing Indian diaspora communities globally, concentrated in Sydney, Melbourne, and Perth. The AUD to INR corridor is well served by digital providers, but rates and fees vary meaningfully between them on any given day.",
    providers: [
      { id: "wise", name: "Wise", note: "Lowest typical spread on AUD/INR, no expiry on referral tracking" },
      { id: "remitly", name: "Remitly", note: "Often zero fee, slightly wider spread than Wise" },
      { id: "xe", name: "XE Money", note: "Strong for larger one-off transfers (property, investments)" },
      { id: "ofx", name: "OFX", note: "No fees on large transfers, 1-2 day settlement" },
      { id: "instarem", name: "Instarem", note: "Competitive on smaller, frequent transfers" },
    ],
    faqs: [
      { q: "What's the best way to send money from Australia to India?", a: "For most regular transfers, a dedicated digital provider (Wise, Remitly, XE) beats an Australian bank's international transfer service — banks typically apply a 2-4% margin above the mid-market rate, while digital providers are usually within 0.5-1.5%. Compare the actual INR you'd receive, not just the headline rate." },
      { q: "Is there a limit on how much I can send from Australia to India?", a: "Australia doesn't cap outward personal remittances, though providers may have their own per-transaction limits and your bank may ask about large transfers for AML compliance. On the India side, FEMA places no cap on inward remittances received by NRIs." },
      { q: "Should I send to an NRE or NRO account?", a: "If you're remitting your own foreign-earned income, an NRE account is usually right — funds and interest are fully repatriable and interest is tax-free for NRIs. NRO accounts are for India-sourced income like rent. This is general information, not tax advice — confirm with an accountant for your situation." },
    ],
    localNotes: [
      "Sydney, Melbourne, and Perth have the largest Indian-Australian populations and the most competitive provider coverage",
      "Australian banks typically charge AUD 15-30 plus a wide exchange margin for international wire transfers — usually the most expensive option",
    ],
    howItWorks: [
      "Enter how much you want to send — we pull live AUD to INR rates from every provider at once",
      "Compare the actual INR amount each provider sends, not just the headline rate — fees and margins vary more than people expect",
      "Click through to your chosen provider and complete the transfer on their site",
      "Set a rate alert if you'd rather wait for a better AUD/INR rate before sending",
    ],
  },
  {
    slug: "uae-to-india",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    flag: "🇦🇪",
    currency: "AED",
    currencySymbol: "AED ",
    nriPopulation: "3.55 million",
    nriPopulationSource: "Ministry of External Affairs, Government of India, 2025",
    metaTitle: "Compare Rates to India from UAE — AED to INR Money Transfer",
    metaDescription: "Compare rates to India from the UAE across Wise, Remitly and other providers. See live AED to INR exchange rates on one of the world's busiest remittance corridors.",
    h1: "Send money to India from the UAE",
    intro: "The UAE is home to the largest NRI population of any country, and the AED to India corridor is one of the busiest remittance routes in the world. Alongside global digital apps, traditional exchange houses like Al Ansari and LuLu Exchange remain widely used for cash pickup and walk-in transfers.",
    providers: [
      { id: "wise", name: "Wise", note: "Strong digital option for bank-to-bank transfers" },
      { id: "remitly", name: "Remitly", note: "Competitive on UAE-India, often zero fee" },
      { id: "xe", name: "XE Money", note: "Good for larger transfers over AED 50,000" },
    ],
    faqs: [
      { q: "Are exchange houses or apps better for sending money from UAE to India?", a: "Exchange houses (Al Ansari, LuLu, Al Fardan) offer extensive cash pickup networks and have served the community for decades, but digital apps have become increasingly competitive on bank-to-bank transfers with the convenience of 24/7 availability. Compare the total INR received, not just the headline rate, across both channels." },
      { q: "Is there a remittance limit from the UAE to India?", a: "The UAE has no restrictions on outward remittances and no capital controls. On the India side, FEMA places no cap on inward remittances received by NRIs, though large or unusual transfers may require supporting documentation." },
      { q: "What's the most cost-effective way to send a large amount, like for property purchase?", a: "For amounts above roughly AED 50,000, even a small exchange rate difference matters more than transfer speed. Compare bank wire rates against dedicated providers, and ask about VIP or corporate rates if you're a high-volume sender." },
    ],
    localNotes: [
      "UAE banks (Emirates NBD, FAB, Mashreq, ADCB) typically apply a 1-2% margin above mid-market plus a flat fee of AED 25-100 per transfer",
      "India is the single largest remittance destination from the UAE by volume",
    ],
    howItWorks: [
      "Enter how much you want to send — we pull live AED to INR rates from every provider at once",
      "Compare the actual INR amount each provider sends, not just the headline rate — fees and margins vary more than people expect",
      "Click through to your chosen provider and complete the transfer on their site",
      "Set a rate alert if you'd rather wait for a better AED/INR rate before sending",
    ],
  },
  {
    slug: "usa-to-india",
    countryCode: "US",
    countryName: "United States",
    flag: "🇺🇸",
    currency: "USD",
    currencySymbol: "$",
    nriPopulation: "2.08 million NRIs (5.4 million incl. PIOs)",
    nriPopulationSource: "Ministry of External Affairs, Government of India, 2025",
    metaTitle: "Compare Rates to India from USA — USD to INR Money Transfer",
    metaDescription: "Compare rates to India from the USA across Wise, Remitly, XE and more. See live USD to INR exchange rates and find the best deal before you send.",
    h1: "Send money to India from the USA",
    intro: "The United States has the largest overseas Indian population in the world, heavily concentrated in technology, healthcare, and academia. The USD to INR corridor is one of the most competitive remittance markets globally, with dozens of providers vying for this volume.",
    providers: [
      { id: "wise", name: "Wise", note: "Consistently tight spread on USD/INR" },
      { id: "remitly", name: "Remitly", note: "Built specifically around remittance corridors like US-India" },
      { id: "xe", name: "XE Money", note: "Established player, good for first-time senders" },
    ],
    faqs: [
      { q: "How do US banks compare to digital remittance apps for sending to India?", a: "US banks typically charge a flat wire fee (often $25-50) plus an exchange margin that can run 2-4% above mid-market. Dedicated remittance apps usually beat this combination significantly for routine transfers." },
      { q: "Do I need to report remittances to India on my US taxes?", a: "Sending your own already-taxed funds to India isn't a separate taxable event in the US. However, if you're transferring more than certain thresholds or the funds relate to foreign accounts you hold, FBAR and FATCA reporting obligations may apply. This is general information, not tax advice — a cross-border tax professional can confirm your specific obligations." },
      { q: "What's the fastest way to send money from the US to India?", a: "Most digital providers (Wise, Remitly) offer transfers that land within minutes to a few hours for standard bank deposits, often faster than traditional bank wires which can take 1-3 business days." },
    ],
    localNotes: [
      "The US-India corridor supports UPI-linked payouts through several providers, letting recipients receive funds directly into UPI apps",
      "H-1B and OPT visa holders sending money home should keep transfer records for any future tax residency determinations",
    ],
    howItWorks: [
      "Enter how much you want to send — we pull live USD to INR rates from every provider at once",
      "Compare the actual INR amount each provider sends, not just the headline rate — fees and margins vary more than people expect",
      "Click through to your chosen provider and complete the transfer on their site",
      "Set a rate alert if you'd rather wait for a better USD/INR rate before sending",
    ],
  },
  {
    slug: "uk-to-india",
    countryCode: "GB",
    countryName: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    currencySymbol: "£",
    nriPopulation: "369,000 NRIs (1.86 million incl. PIOs)",
    nriPopulationSource: "Ministry of External Affairs, Government of India, 2025",
    metaTitle: "Compare Rates to India from UK — GBP to INR Money Transfer",
    metaDescription: "Compare rates to India from the UK across Wise, Remitly, XE and more. See live GBP to INR exchange rates for British Indians sending money home.",
    h1: "Send money to India from the UK",
    intro: "British Indians form one of the longest-established and most economically successful diaspora communities in the UK. The GBP to INR corridor benefits from intense competition between digital providers, keeping rates relatively tight for senders.",
    providers: [
      { id: "wise", name: "Wise", note: "Headquartered in London, deep GBP corridor expertise" },
      { id: "remitly", name: "Remitly", note: "Strong UK presence with competitive GBP/INR rates" },
      { id: "xe", name: "XE Money", note: "Long-established, well-suited to larger transfers" },
    ],
    faqs: [
      { q: "What's the best way to send money from the UK to India?", a: "Dedicated digital providers typically beat UK high-street banks significantly on the GBP-INR corridor — banks often apply a 2-3% margin plus a transfer fee, while providers like Wise or Remitly are usually within 0.5-1.5% of the mid-market rate." },
      { q: "Are there limits on sending money from the UK to India?", a: "The UK doesn't restrict outward personal remittances, though large transfers may trigger your bank's anti-money-laundering checks (a routine source-of-funds question, not a block). India's FEMA rules place no cap on inward remittances to NRIs." },
      { q: "How quickly do transfers from the UK reach India?", a: "Most digital providers complete UK-to-India transfers within a few hours to one business day for standard bank deposits, depending on the provider and payment method used." },
    ],
    localNotes: [
      "London, Leicester, and Birmingham have the largest British Indian populations and the deepest provider coverage",
      "UK banks settling via SWIFT can take 2-4 business days and often charge £15-30 in wire fees alone",
    ],
    howItWorks: [
      "Enter how much you want to send — we pull live GBP to INR rates from every provider at once",
      "Compare the actual INR amount each provider sends, not just the headline rate — fees and margins vary more than people expect",
      "Click through to your chosen provider and complete the transfer on their site",
      "Set a rate alert if you'd rather wait for a better GBP/INR rate before sending",
    ],
  },
  {
    slug: "canada-to-india",
    countryCode: "CA",
    countryName: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    currencySymbol: "C$",
    nriPopulation: "2.87 million (incl. PIOs)",
    nriPopulationSource: "Ministry of External Affairs, Government of India, 2025",
    metaTitle: "Compare Rates to India from Canada — CAD to INR Money Transfer",
    metaDescription: "Compare rates to India from Canada across Wise, Remitly, XE and more. See live CAD to INR exchange rates for Indo-Canadians sending money home.",
    h1: "Send money to India from Canada",
    intro: "Indo-Canadians are one of the largest and fastest-growing non-European ethnic communities in Canada, with major hubs in Toronto, Vancouver, and Calgary. The CAD to INR corridor is well-served by digital providers offering rates well below traditional Canadian banks.",
    providers: [
      { id: "wise", name: "Wise", note: "Reliable CAD/INR rate, widely used by Canadian NRIs" },
      { id: "remitly", name: "Remitly", note: "Often zero fee on standard CAD-India transfers" },
      { id: "xe", name: "XE Money", note: "Good fit for larger or less frequent transfers" },
    ],
    faqs: [
      { q: "What's the best way to send money from Canada to India?", a: "Canadian banks typically apply a wide exchange margin (often 2-3%) on international wires plus a flat fee. Digital remittance providers usually offer a meaningfully better total rate for routine transfers to India." },
      { q: "Is there a remittance limit from Canada to India?", a: "Canada doesn't cap outward personal remittances. Providers may have their own transaction limits, and very large transfers may prompt standard source-of-funds questions from your bank, which is routine compliance rather than a restriction." },
      { q: "How long do CAD to INR transfers usually take?", a: "Digital providers typically settle within a few hours to one business day for standard bank deposits, compared to 2-4 business days for a traditional bank wire." },
    ],
    localNotes: [
      "Toronto (Brampton, Mississauga) and Vancouver (Surrey) have the largest Indo-Canadian populations",
      "Indo-Canadians are the second-largest non-European ethnic group in Canada, supporting strong provider competition on this corridor",
    ],
    howItWorks: [
      "Enter how much you want to send — we pull live CAD to INR rates from every provider at once",
      "Compare the actual INR amount each provider sends, not just the headline rate — fees and margins vary more than people expect",
      "Click through to your chosen provider and complete the transfer on their site",
      "Set a rate alert if you'd rather wait for a better CAD/INR rate before sending",
    ],
  },
  {
    slug: "singapore-to-india",
    countryCode: "SG",
    countryName: "Singapore",
    flag: "🇸🇬",
    currency: "SGD",
    currencySymbol: "S$",
    nriPopulation: "Significant Tamil and broader Indian community",
    nriPopulationSource: "Singapore Department of Statistics, general estimate",
    metaTitle: "Compare Rates to India from Singapore — SGD to INR Money Transfer",
    metaDescription: "Compare rates to India from Singapore across Wise, Remitly, XE and more. See live SGD to INR exchange rates for the Indian community in Singapore.",
    h1: "Send money to India from Singapore",
    intro: "Singapore's Indian community, including a long-established Tamil population, is well served by digital remittance providers offering fast, transparent SGD to INR transfers as an alternative to traditional bank wires and money changers.",
    providers: [
      { id: "wise", name: "Wise", note: "Competitive SGD/INR rate, widely used in Singapore" },
      { id: "remitly", name: "Remitly", note: "Fast settlement on the SGD-India corridor" },
      { id: "xe", name: "XE Money", note: "Established option for larger transfers" },
    ],
    faqs: [
      { q: "What's the best way to send money from Singapore to India?", a: "Digital providers generally offer a tighter exchange margin than Singapore banks or traditional money changers for transfers to India, particularly for routine monthly remittances." },
      { q: "Are there limits on remittances from Singapore to India?", a: "Singapore doesn't restrict outward personal remittances. India's FEMA framework places no cap on inward remittances received by NRIs, though large or unusual transfers may require standard documentation." },
    ],
    localNotes: [
      "Singapore's Tamil community has deep ties to South India, particularly Tamil Nadu",
    ],
    howItWorks: [
      "Enter how much you want to send — we pull live SGD to INR rates from every provider at once",
      "Compare the actual INR amount each provider sends, not just the headline rate — fees and margins vary more than people expect",
      "Click through to your chosen provider and complete the transfer on their site",
      "Set a rate alert if you'd rather wait for a better SGD/INR rate before sending",
    ],
  },
];

export function getCorridorBySlug(slug: string): Corridor | undefined {
  return CORRIDORS.find((c) => c.slug === slug);
}

export function getCorridorByCountryCode(countryCode: string): Corridor | undefined {
  return CORRIDORS.find((c) => c.countryCode === countryCode.toUpperCase());
}

export function getAllCorridorSlugs(): string[] {
  return CORRIDORS.map((c) => c.slug);
}

// ─── Honesty note for future maintainers ──────────────────────────────────
// nriPopulation figures are sourced from MEA 2025 data where cited. Provider
// "note" fields are directional characterizations based on publicly available
// comparison content (Wise/Remitly/XE generally serve all these corridors;
// rates and relative ranking shift over time and by amount). FAQs are written
// as general informational content, not financial/legal/tax advice — this
// matches the disclaimer pattern already used in the AI suggestion route.
