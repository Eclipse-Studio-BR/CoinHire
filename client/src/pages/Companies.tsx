import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CompanyCard } from "@/components/CompanyCard";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import type { Company } from "@shared/schema";

type CompanyWithStats = Company & { jobCount: number };

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: companies = [], isLoading } = useQuery<CompanyWithStats[]>({
    queryKey: ["/api/companies", { search: searchTerm }],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
              Web3 Companies Hiring
            </h1>
            <p className="text-muted-foreground">
              {companies.length} {companies.length === 1 ? 'company' : 'companies'} actively hiring
            </p>
          </div>

          <Card className="p-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search companies by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-companies"
              />
            </div>
          </Card>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 h-64 animate-pulse bg-card">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </Card>
              ))}
            </div>
          ) : companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company} jobCount={company.jobCount} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="text-6xl">🏢</div>
                <h3 className="text-xl font-semibold">No companies found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search to find companies.
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
