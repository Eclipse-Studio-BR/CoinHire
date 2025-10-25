import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Briefcase } from "lucide-react";

/**
 * LandingSearch
 * - No "Remote only" toggle
 * - Forwards to /jobs with ?search= & ?location=
 */
export default function LandingSearch() {
  const [, navigate] = useLocation();
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keywords.trim()) params.set("search", keywords.trim());
    if (location.trim()) params.set("location", location.trim());
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-xl bg-background/70 backdrop-blur border shadow-md p-3 md:p-4 flex flex-col md:flex-row gap-3 items-stretch"
      data-testid="form-landing-search"
    >
      <div className="flex-1 flex items-center gap-2 rounded-lg border px-3 py-2">
        <Briefcase className="h-5 w-5 opacity-70" />
        <Input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="border-0 focus-visible:ring-0 px-0"
          placeholder="Job title, keywords, or company"
          aria-label="Job keywords"
        />
      </div>

      <div className="md:w-80 flex items-center gap-2 rounded-lg border px-3 py-2">
        <MapPin className="h-5 w-5 opacity-70" />
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="border-0 focus-visible:ring-0 px-0"
          placeholder="Location (e.g., Remote, NYC)"
          aria-label="Location"
        />
      </div>

      <Button size="lg" type="submit" className="md:w-40">Search jobs</Button>
    </form>
  );
}
