import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Division, WorkStatus } from '@/types/database';

// Global Fix: Interface updated to remove assignedTo and employees
interface WorkFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  division: string;
  onDivisionChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  divisions: Division[];
  onClearFilters: () => void;
  hasFilters: boolean;
}

// Global Fix: Statuses match the capitalized Enum in your Supabase DB
const statuses: WorkStatus[] = ['Pipeline', 'Running', 'Review', 'Completed'];

export function WorkFilters({
  search,
  onSearchChange,
  division,
  onDivisionChange,
  status,
  onStatusChange,
  divisions,
  onClearFilters,
  hasFilters,
}: WorkFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search Input - Standardized to UBQN, Work Name, or Client */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search UBQN, Work, or Client..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Division Dropdown */}
      <Select value={division} onValueChange={onDivisionChange}>
        <SelectTrigger className="w-[160px] h-10 font-medium">
          <SelectValue placeholder="All Divisions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Sectors</SelectItem>
          {divisions.map((d) => (
            <SelectItem key={d.id} value={d.code}>
              {d.name} ({d.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Dropdown */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[150px] h-10 font-medium">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {s === 'Pipeline' ? 'Pipeline C1' : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-10 text-muted-foreground hover:text-red-600 transition-colors"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}