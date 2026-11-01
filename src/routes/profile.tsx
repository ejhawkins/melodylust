import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CuratorDossier, DOSSIER_TABS, type DossierTab } from "@/components/CuratorDossier";

const isTab = (value: unknown): value is DossierTab => DOSSIER_TABS.some(t => t.id === value);

export const Route = createFileRoute("/profile")({
  // ?tab=dna opens a tab directly; anything else falls back to the Want List.
  validateSearch: (search: Record<string, unknown>): { tab?: DossierTab } => (isTab(search["tab"]) ? { tab: search["tab"] } : {}),
  head: () => ({ meta: [
    { title: "Curator Dossier — Melody Lust" },
    { name: "description", content: "Your Melody Lust dossier: the edit you've saved, your Style DNA and your Styling Notes." },
    // A personal page: nothing here belongs in search results.
    { name: "robots", content: "noindex" },
  ] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <CuratorDossier tab={tab ?? "edits"} onTabChange={next => void navigate({ search: { tab: next }, replace: true, resetScroll: false })} />;
}
