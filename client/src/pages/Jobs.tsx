import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { JOB_CATEGORIES, JOB_TYPES, EXPERIENCE_LEVELS } from "@/lib/constants";
import type { Job, Company } from "@shared/schema";

type JobWithCompany = Job & { company?: Company };

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("recent");
  const [showFilters, setShowFilters] = useState(true);

  const { data: jobs = [], isLoading } = useQuery<JobWithCompany[]>({
    queryKey: ["/api/jobs", { search: searchTerm, category: selectedCategory, type: selectedType, level: selectedLevel, remote: remoteOnly, sort: sortBy }],
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedType("");
    setSelectedLevel("");
    setRemoteOnly(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
              Find Web3 Jobs
            </h1>
            <p className="text-muted-foreground">
              {jobs.length} {jobs.length === 1 ? 'opportunity' : 'opportunities'} available
            </p>
          </div>

          {/* Search Bar */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search jobs by title, skill, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-jobs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                  className="gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40" data-testid="select-sort-by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="relevant">Most Relevant</SelectItem>
                    <SelectItem value="salary_high">Salary (High)</SelectItem>
                    <SelectItem value="salary_low">Salary (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            {showFilters && (
              <aside className="lg:col-span-1 space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-semibold text-lg">Filters</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
                      className="text-xs"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label className="mb-3 block">Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          {JOB_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-3 block">Job Type</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger data-testid="select-job-type">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          {Object.entries(JOB_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-3 block">Experience Level</Label>
                      <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger data-testid="select-experience-level">
                          <SelectValue placeholder="All levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All levels</SelectItem>
                          {Object.entries(EXPERIENCE_LEVELS).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remote"
                        checked={remoteOnly}
                        onCheckedChange={(checked) => setRemoteOnly(checked as boolean)}
                        data-testid="checkbox-remote-only"
                      />
                      <Label htmlFor="remote" className="cursor-pointer">
                        Remote only
                      </Label>
                    </div>
                  </div>
                </Card>
              </aside>
            )}

            {/* Job Listings */}
            <div className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="p-6 h-48 animate-pulse bg-card">
                      <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </Card>
                  ))}
                </div>
              ) : jobs.length > 0 ? (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="text-6xl">🔍</div>
                    <h3 className="text-xl font-semibold">No jobs found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your filters or search terms to find more opportunities.
                    </p>
                    <Button variant="outline" onClick={clearFilters} data-testid="button-clear-all">
                      Clear all filters
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
