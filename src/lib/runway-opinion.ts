// Runway Style Opinions: a visitor's take on a runway film, saved as a Styling Note of kind "runway_opinion" so it
// shares sign-in, ownership, pending review and moderation. Client-safe and shared by the composer and the server,
// so both validate the same way; the show is picked from this list by the page, never typed by the visitor.
import { z } from "zod";

export const RUNWAY_TOPICS = {
  "thom-browne-fw17": { house: "Thom Browne", season: "Fall/Winter 2017", tags: ["thom browne", "fw17", "runway film"] },
} as const satisfies Record<string, { house: string; season: string; tags: readonly string[] }>;

export type RunwayTopicId = keyof typeof RUNWAY_TOPICS;
const topicIds = Object.keys(RUNWAY_TOPICS) as [RunwayTopicId, ...RunwayTopicId[]];

/** The Listening Room hero film's show. */
export const HERO_FILM_TOPIC: RunwayTopicId = "thom-browne-fw17";

/** "Thom Browne · Fall/Winter 2017" for display; an unknown id (an old row) shows as-is. */
export function topicLabel(topic: string): string {
  const t = RUNWAY_TOPICS[topic as RunwayTopicId];
  return t ? `${t.house} · ${t.season}` : topic;
}

/** The title an opinion starts with: the show itself. */
export function defaultOpinionTitle(topic: RunwayTopicId): string {
  const t = RUNWAY_TOPICS[topic];
  return `${t.house} ${t.season}`;
}

export const OPINION_LIMITS = { titleMin: 3, titleMax: 120, opinionMin: 10, opinionMax: 2000, notesMax: 500 } as const;

export const runwayOpinionInput = z.object({
  id: z.string().uuid().optional(),
  topic: z.enum(topicIds),
  title: z.string().trim().min(OPINION_LIMITS.titleMin, "Give your opinion a title.").max(OPINION_LIMITS.titleMax),
  opinion: z.string().trim().min(OPINION_LIMITS.opinionMin, "Say a little more: at least 10 characters.").max(OPINION_LIMITS.opinionMax),
  notes: z.string().trim().max(OPINION_LIMITS.notesMax).default(""),
}).strict();

export type RunwayOpinionInput = z.input<typeof runwayOpinionInput>;
export type RunwayOpinion = z.output<typeof runwayOpinionInput>;

/** The first problem per field, for the composer to show under each input. */
export function opinionErrors(input: RunwayOpinionInput): Partial<Record<"title" | "opinion" | "notes" | "topic", string>> {
  const parsed = runwayOpinionInput.safeParse(input);
  if (parsed.success) return {};
  const errors: Partial<Record<"title" | "opinion" | "notes" | "topic", string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if ((field === "title" || field === "opinion" || field === "notes" || field === "topic") && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** The Styling Notes row an opinion is saved as: always pending, owned by the signed-in visitor, no song or photos. */
export function runwayOpinionRow(opinion: RunwayOpinion, ownerId: string, displayName: string) {
  return {
    owner_id: ownerId,
    author_display_name: displayName.trim().slice(0, 60) || "Melody Lust reader",
    kind: "runway_opinion",
    topic: opinion.topic,
    title: opinion.title,
    styling_idea: opinion.opinion,
    extra_notes: opinion.notes,
    tags: [...RUNWAY_TOPICS[opinion.topic].tags],
    song_artist: "",
    song_track: "",
    song_reason: "",
    photo_paths: [] as string[],
    photo_alts: [] as string[],
    status: "pending" as const,
  };
}

/** What a moderator's decision writes. Approve or reject, never back to pending; a rejection always has a reason. */
export function reviewChange(decision: "approved" | "rejected", reason: string | undefined, reviewerId: string, now: Date) {
  return {
    status: decision,
    rejection_reason: decision === "rejected" ? reason?.trim() || "Not approved." : null,
    reviewed_by: reviewerId,
    reviewed_at: now.toISOString(),
  };
}

/** Moderators and admins review; everyone else is turned away by the server. */
export const canModerate = (roles: readonly string[]) => roles.some(role => role === "moderator" || role === "admin");
