import { createClient } from "@supabase/supabase-js";
import { spotifyTrackId } from "../src/lib/runway-archive.ts";
import { createSupabaseFetch } from "../src/lib/supabase-fetch.ts";

const valueAfter = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const approveId = valueAfter("--approve");
const rejectId = valueAfter("--reject");
if (approveId && rejectId) throw new Error("Choose either --approve or --reject, not both.");

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SECRET_KEY"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.");
const db = createClient(url, key, {
  global: { fetch: createSupabaseFetch(key) },
  auth: { persistSession: false, autoRefreshToken: false },
});

if (!approveId && !rejectId) {
  const requestedLimit = Number(valueAfter("--limit") ?? "20");
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100)
    throw new Error("--limit must be an integer from 1 to 100.");
  const { data, error } = await db
    .from("runway_song_candidates")
    .select(
      "id,title,artist,category,show_name,show_season,source_url,spotify_url,designer:designers!inner(name)",
    )
    .eq("status", "pending")
    .order("created_at")
    .limit(requestedLimit);
  if (error) throw new Error(`Could not load review queue: ${error.message}`);
  if (!data?.length) {
    console.log("No runway song candidates are waiting for review.");
    process.exit(0);
  }
  for (const candidate of data) {
    const designer = Array.isArray(candidate.designer) ? candidate.designer[0] : candidate.designer;
    console.log(
      `\n${candidate.id}  ${designer?.name ?? "Unknown designer"} — ${candidate.title} / ${candidate.artist}`,
    );
    console.log(`  show: ${candidate.show_season ?? candidate.show_name ?? "missing"}`);
    console.log(
      `  energy: ${candidate.category ?? "missing"}  spotify: ${candidate.spotify_url ?? "missing"}`,
    );
    console.log(`  evidence: ${candidate.source_url}`);
  }
  console.log("\nApprove: npm run designers:review-songs -- --approve ID");
  console.log("Reject:  npm run designers:review-songs -- --reject ID");
  process.exit(0);
}

const candidateId = approveId ?? rejectId!;
if (!/^[0-9a-f-]{36}$/i.test(candidateId))
  throw new Error("Candidate ID must be a UUID from the review queue.");

if (rejectId) {
  const { data, error } = await db
    .from("runway_song_candidates")
    .update({ status: "rejected" })
    .eq("id", candidateId)
    .eq("status", "pending")
    .select("title,artist")
    .maybeSingle();
  if (error) throw new Error(`Could not reject candidate: ${error.message}`);
  if (!data) throw new Error("Candidate was not found or is no longer pending.");
  console.log(`Rejected ${data.title} — ${data.artist}.`);
  process.exit(0);
}

const { data: candidate, error: loadError } = await db
  .from("runway_song_candidates")
  .select("title,artist,category,spotify_url,status")
  .eq("id", candidateId)
  .maybeSingle();
if (loadError) throw new Error(`Could not load candidate: ${loadError.message}`);
if (!candidate || candidate.status !== "pending")
  throw new Error("Candidate was not found or is no longer pending.");

const spotifyUrl = valueAfter("--spotify") ?? candidate.spotify_url;
const trackId = spotifyTrackId(spotifyUrl ?? "");
if (!trackId)
  throw new Error(
    "Approval requires a Spotify track URL. Pass --spotify https://open.spotify.com/track/...",
  );
const category = valueAfter("--category") ?? candidate.category;
if (!category || !["A", "B", "C", "D"].includes(category))
  throw new Error("Approval requires --category A, B, C, or D.");

const { error: approveError } = await db
  .from("runway_song_candidates")
  .update({
    status: "approved",
    spotify_url: `https://open.spotify.com/track/${trackId}`,
    category,
  })
  .eq("id", candidateId)
  .eq("status", "pending");
if (approveError) throw new Error(`Could not approve candidate: ${approveError.message}`);
console.log(
  `Approved ${candidate.title} — ${candidate.artist}. It is now eligible for the fashion radio.`,
);
