import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export interface TalentFilterState {
  jobTypes: string[];
  availability: string[];
  flexibility: string[];
}

interface TalentFiltersProps {
  filters: TalentFilterState;
  onFiltersChange: (filters: TalentFilterState) => void;
  locationSearch: string;
  onLocationChange: (location: string) => void;
}

export function TalentFilters({ 
  filters, 
  onFiltersChange, 
  locationSearch, 
  onLocationChange 
}: TalentFiltersProps) {

  const handleJobTypeChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, jobTypes: [] });
    } else {
      onFiltersChange({ ...filters, jobTypes: [value] });
    }
  };

  const handleAvailabilityChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, availability: [] });
    } else {
      onFiltersChange({ ...filters, availability: [value] });
    }
  };

  const handleFlexibilityChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, flexibility: [] });
    } else {
      onFiltersChange({ ...filters, flexibility: [value] });
    }
  };

  const handleClear = () => {
    onFiltersChange({ jobTypes: [], availability: [], flexibility: [] });
    onLocationChange('');
  };

  const hasActiveFilters = filters.jobTypes.length > 0 || 
    filters.availability.length > 0 || 
    filters.flexibility.length > 0 || 
    locationSearch.length > 0;

  return (
    <div className="w-80 bg-[#0a0f1a] border-r border-gray-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Location / City */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-300">Location / City</Label>
        <Input
          placeholder="e.g., Remote, New York, London"
          value={locationSearch}
          onChange={(e) => onLocationChange(e.target.value)}
          className="bg-[#1a1f2e] border-gray-700 text-white placeholder:text-gray-500"
        />
      </div>

      {/* Preferred Job Type */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-300">Preferred Job Type</Label>
        <select
          value={filters.jobTypes[0] || 'all'}
          onChange={(e) => handleJobTypeChange(e.target.value)}
          className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All types</option>
          <option value="full_time">Full-Time</option>
          <option value="part_time">Part-Time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      {/* Job Availability */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-300">Job Availability</Label>
        <select
          value={filters.availability[0] || 'all'}
          onChange={(e) => handleAvailabilityChange(e.target.value)}
          className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All availability</option>
          <option value="actively_looking">Actively Looking</option>
          <option value="open_to_offers">Open To Offers</option>
          <option value="not_available">Not Available</option>
        </select>
      </div>

      {/* Work Flexibility */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-300">Work Flexibility</Label>
        <select
          value={filters.flexibility[0] || 'all'}
          onChange={(e) => handleFlexibilityChange(e.target.value)}
          className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All flexibility</option>
          <option value="onsite">Onsite</option>
          <option value="remote">Remote</option>
        </select>
      </div>
    </div>
  );
}
