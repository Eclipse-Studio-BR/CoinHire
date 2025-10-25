import { Link } from "wouter";
import { usePlatformStats } from "@/hooks/usePlatformStats";

type StatProps = { label: string; value: number | string; href?: string };

function Stat({ label, value, href }: StatProps) {
  const content = (
    <div className="text-center space-y-1">
      <div className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
        {typeof value === "number" ? value.toLocaleString() + "+" : value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
  return href ? (
    <Link href={href}>
      <a className="block transition-transform hover:scale-[1.01]">{content}</a>
    </Link>
  ) : content;
}

export default function StatsRow() {
  const { jobsActive, companiesHiring, candidates, loading } = usePlatformStats();

  return (
    <div className="mt-10 grid grid-cols-3 gap-6 max-w-3xl mx-auto">
      <Stat
        label="Active Jobs"
        value={loading ? "…" : jobsActive}
        href="/jobs?status=active"
      />
      <Stat
        label="Companies Hiring"
        value={loading ? "…" : companiesHiring}
        href="/companies?filter=hiring"
      />
      {/* Rename label here if you prefer "Hires made", "Matches", etc. */}
      <Stat
        label="Candidates"
        value={loading ? "…" : candidates}
        href="/candidates"
      />
    </div>
  );
}
