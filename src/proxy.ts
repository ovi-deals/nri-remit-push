import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` — same mechanics, runs
// before every matched request. This proxy does two things:
//   1. Keeps the Supabase session cookie fresh.
//   2. Reads Vercel's built-in geolocation header and stores the detected
//      country as a readable cookie, so client components can show
//      "Sending from {country}?" without calling any external geo API.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touch the session so expired tokens get refreshed via the cookies above.
  // Do NOT add logic between createServerClient and this call.
  await supabase.auth.getUser();

  // Vercel populates this header on every request with no extra package or
  // API call needed. It's absent in local dev (`next dev`) and on platforms
  // other than Vercel — the client-side hook that reads this cookie always
  // has a "no detection available, please pick your country" fallback path.
  const detectedCountry = request.headers.get("x-vercel-ip-country");
  if (detectedCountry) {
    supabaseResponse.cookies.set("nri_detected_country", detectedCountry, {
      maxAge: 60 * 60 * 24, // 1 day — re-detect periodically rather than sticking forever
      sameSite: "lax",
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, so the session cookie
     * is refreshed on page loads and API calls without doing extra work
     * for images/fonts/etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
