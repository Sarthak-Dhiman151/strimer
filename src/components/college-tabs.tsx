import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", path: (s: string) => `/c/${s}` },
  { key: "reviews", label: "Reviews", path: (s: string) => `/c/${s}/reviews` },
] as const;

const SOON = [
  { key: "community", label: "Community" },
  { key: "placements", label: "Placements" },
] as const;

export function CollegeTabs({
  slug,
  active,
}: {
  slug: string;
  active: "overview" | "reviews";
}) {
  return (
    <nav
      className="mb-5 flex gap-1 overflow-x-auto border-b"
      aria-label="College sections"
    >
      {TABS.map((tab) =>
        tab.key === active ? (
          <span
            key={tab.key}
            aria-current="page"
            className="-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.key}
            href={tab.path(slug)}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/30 hover:text-foreground"
          >
            {tab.label}
          </Link>
        ),
      )}
      {SOON.map((tab) => (
        <span
          key={tab.key}
          aria-disabled="true"
          title="Coming soon"
          className="px-3 py-2 text-sm text-muted-foreground/60"
        >
          {tab.label}
        </span>
      ))}
    </nav>
  );
}
