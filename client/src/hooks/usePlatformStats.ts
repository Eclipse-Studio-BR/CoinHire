// Lightweight, logic-safe stats loader.
// Strategy:
// 1) If your app already exposes stores/hooks, we read from them (no extra requests).
// 2) Else we call common REST endpoints (adjust ONE place below if your routes differ).
// 3) Always fails gracefully to 0.

import { useEffect, useMemo, useState } from "react";

// ---- OPTIONAL: uncomment/adjust if you already have global stores ----
// import { useJobsStore } from "@/stores/jobs";
// import { useCompaniesStore } from "@/stores/companies";
// import { useCandidatesStore } from "@/stores/candidates";

type Stats = {
  jobsActive: number;
  companiesHiring: number;
  candidates: number;
};

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function usePlatformStats() {
  const [stats, setStats] = useState<Stats>({ jobsActive: 0, companiesHiring: 0, candidates: 0 });
  const [loading, setLoading] = useState(true);

  // ---- Strategy 1: derive from existing stores if present ----
  // const derived = useMemo(() => {
  //   const jobs = useJobsStore.getState?.().jobs ?? [];
  //   const companies = useCompaniesStore.getState?.().companies ?? [];
  //   const people = useCandidatesStore.getState?.().candidates ?? [];
  //   return {
  //     jobsActive: jobs.filter((j: any) => j.status === "active").length,
  //     companiesHiring: companies.filter((c: any) => (c.openRoles ?? 0) > 0).length,
  //     candidates: people.length,
  //   } as Stats;
  // }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // If you enable Strategy 1 above and it yields non-zero values, prefer them:
      // if ((derived.jobsActive || derived.companiesHiring || derived.candidates) && !cancelled) {
      //   setStats(derived); setLoading(false); return;
      // }

      // ---- Strategy 2: REST endpoints (adjust these paths once if needed) ----
      // Expected responses can be either `{ count: number }`
      // or an array we then .length (we handle both).
      const [
        jobsCountRaw,
        companiesCountRaw,
        candidatesCountRaw,
      ] = await Promise.all([
        // Common patterns seen in job-board backends — tweak as needed:
        fetchJSON<any>("/api/jobs/count?status=active") ?? fetchJSON<any>("/api/jobs?status=active&limit=1&count=true"),
        fetchJSON<any>("/api/companies/count?isHiring=true") ?? fetchJSON<any>("/api/companies?isHiring=true&limit=1&count=true"),
        fetchJSON<any>("/api/candidates/count") ?? fetchJSON<any>("/api/users?role=candidate&limit=1&count=true"),
      ]);

      const toNumber = (val: any): number => {
        if (val == null) return 0;
        if (typeof val === "number") return val;
        if (Array.isArray(val)) return val.length;
        if (typeof val === "object" && "count" in val) return Number(val.count) || 0;
        return Number(val) || 0;
      };

      const next: Stats = {
        jobsActive: toNumber(jobsCountRaw),
        companiesHiring: toNumber(companiesCountRaw),
        candidates: toNumber(candidatesCountRaw),
      };

      if (!cancelled) {
        setStats(next);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  return { ...stats, loading };
}
