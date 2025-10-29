import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Calendar,
  SlidersHorizontal,
  X
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { getToolIcon, getLanguageFlag } from "@/lib/iconHelpers";
import { Link } from "wouter";
import type { TalentProfile, User } from "@shared/schema";

type TalentWithUser = TalentProfile & {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'profileImageUrl'>;
};

export default function Talents() {
  const [searchName, setSearchName] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [selectedJobType, setSelectedJobType] = useState<string>("");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("");
  const [selectedFlexibility, setSelectedFlexibility] = useState<string>("");
  const [sortBy, setSortBy] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);

  // Detect screen size and show/hide filters accordingly
  useEffect(() => {
    const handleResize = () => {
      setShowFilters(window.innerWidth >= 1024);
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: talents = [], isLoading, isFetching } = useQuery<TalentWithUser[]>({
    queryKey: ["/api/talents/public"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
  });

  // Filter talents based on search and filters
  const filteredTalents = talents.filter((talent) => {
    const fullName = `${talent.user.firstName || ''} ${talent.user.lastName || ''}`.toLowerCase();
    const nameMatch = !searchName || fullName.includes(searchName.toLowerCase()) || talent.headline?.toLowerCase().includes(searchName.toLowerCase());
    const locationMatch = !searchLocation || talent.location?.toLowerCase().includes(searchLocation.toLowerCase());
    
    // Filter by job type
    const jobTypeMatch = !selectedJobType || selectedJobType === 'all' || 
      (talent.preferredJobTypes && talent.preferredJobTypes.includes(selectedJobType));
    
    // Filter by availability
    const availabilityMatch = !selectedAvailability || selectedAvailability === 'all' || 
      (talent.jobAvailability && talent.jobAvailability === selectedAvailability);
    
    // Filter by flexibility
    const flexibilityMatch = !selectedFlexibility || selectedFlexibility === 'all' || 
      (talent.workFlexibility && talent.workFlexibility.includes(selectedFlexibility));
    
    return nameMatch && locationMatch && jobTypeMatch && availabilityMatch && flexibilityMatch;
  });

  // Sort talents
  const sortedTalents = [...filteredTalents].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    return 0;
  });

  const clearFilters = () => {
    setSearchName("");
    setSearchLocation("");
    setSelectedJobType("");
    setSelectedAvailability("");
    setSelectedFlexibility("");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Talents Listing
            </h1>
            <p className="text-muted-foreground max-w-4xl">
              Browse public talent profiles to discover skilled professionals in Web3 and blockchain. 
              Talents with public profiles gain increased visibility and access to exclusive features, 
              helping them connect with companies seeking their expertise.
            </p>
          </div>

          {/* Search Bar */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Talent Name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {showFilters ? "Hide" : "Show"} Filters
                </Button>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
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
                      className="text-xs"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {/* Location / City */}
                    <div>
                      <Label htmlFor="filter-location" className="mb-3 block">
                        Location / City
                      </Label>
                      <Input
                        id="filter-location"
                        placeholder="e.g., Remote, New York, London"
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label className="mb-3 block">Preferred Job Type</Label>
                      <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="full_time">Full-Time</SelectItem>
                          <SelectItem value="part_time">Part-Time</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-3 block">Job Availability</Label>
                      <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                        <SelectTrigger>
                          <SelectValue placeholder="All availability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All availability</SelectItem>
                          <SelectItem value="actively_looking">Actively Looking</SelectItem>
                          <SelectItem value="open_to_offers">Open To Offers</SelectItem>
                          <SelectItem value="not_available">Not Available</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-3 block">Work Flexibility</Label>
                      <Select value={selectedFlexibility} onValueChange={setSelectedFlexibility}>
                        <SelectTrigger>
                          <SelectValue placeholder="All flexibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All flexibility</SelectItem>
                          <SelectItem value="onsite">Onsite</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              </aside>
            )}

            {/* Talents Listings */}
            <div className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}>
              {isLoading || isFetching ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="p-6 h-48 animate-pulse bg-card">
                      <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </Card>
                  ))}
                </div>
              ) : sortedTalents.length > 0 ? (
                <div className="space-y-4">
                  {sortedTalents.map((talent) => (
                    <Card key={talent.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Avatar */}
                          <Avatar className="h-16 w-16">
                            <AvatarImage
                              src={talent.user.profileImageUrl || undefined}
                              alt={`${talent.user.firstName} ${talent.user.lastName}`}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-lg">
                              {getInitials(talent.user.firstName, talent.user.lastName, talent.user.email)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold">
                                  {talent.user.firstName} {talent.user.lastName}
                                </h3>
                                {talent.headline && (
                                  <p className="text-primary font-medium">{talent.headline}</p>
                                )}
                              </div>
                            </div>

                            {/* Location */}
                            {talent.location && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                <MapPin className="h-4 w-4" />
                                {talent.location}
                              </div>
                            )}

                            {/* Details */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              {talent.preferredJobTypes && talent.preferredJobTypes.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Briefcase className="h-4 w-4" />
                                  {talent.preferredJobTypes[0].replace('_', '-')}
                                </div>
                              )}
                              {talent.workFlexibility && talent.workFlexibility.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {talent.workFlexibility[0]}
                                </div>
                              )}
                            </div>

                            {/* Skills */}
                            {talent.skills && talent.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {talent.skills.slice(0, 5).map((skill, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {skill}
                                  </Badge>
                                ))}
                                {talent.skills.length > 5 && (
                                  <Badge variant="secondary">+{talent.skills.length - 5} more</Badge>
                                )}
                              </div>
                            )}

                            {/* Tools */}
                            {talent.tools && talent.tools.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {talent.tools.slice(0, 4).map((tool, idx) => (
                                  <Badge key={idx} variant="outline" className="flex items-center gap-1.5">
                                    <img 
                                      src={getToolIcon(tool)} 
                                      alt={tool}
                                      className="w-3.5 h-3.5 object-contain"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <span>{tool}</span>
                                  </Badge>
                                ))}
                                {talent.tools.length > 4 && (
                                  <Badge variant="outline">+{talent.tools.length - 4}</Badge>
                                )}
                              </div>
                            )}

                            {/* Languages */}
                            {talent.languages && talent.languages.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {talent.languages.slice(0, 3).map((language, idx) => (
                                  <Badge key={idx} variant="secondary" className="flex items-center gap-1.5">
                                    <span className="text-sm">{getLanguageFlag(language)}</span>
                                    <span>{language}</span>
                                  </Badge>
                                ))}
                                {talent.languages.length > 3 && (
                                  <Badge variant="secondary">+{talent.languages.length - 3}</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            className={
                              talent.jobAvailability === 'actively_looking' 
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : talent.jobAvailability === 'open_to_offers'
                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                : "bg-red-500 hover:bg-red-600 text-white"
                            }
                          >
                            {talent.jobAvailability === 'actively_looking' 
                              ? "Actively Looking"
                              : talent.jobAvailability === 'open_to_offers'
                              ? "Open To Offers"
                              : "Not Available"}
                          </Badge>
                          <Button asChild size="sm">
                            <Link href={`/talents/${talent.userId}`}>
                              View Profile
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="text-6xl">🔍</div>
                    <h3 className="text-xl font-semibold">No talents found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your filters or search terms to find more talent profiles.
                    </p>
                    <Button variant="outline" onClick={clearFilters}>
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
