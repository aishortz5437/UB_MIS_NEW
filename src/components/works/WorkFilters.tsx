import { Search, X, ArrowUp, ArrowDown } from 'lucide-react';
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
  sortOrder: 'asc' | 'desc';
  onSortChange: () => void;
}

// Global Fix: Statuses match the capitalized Enum in your Supabase DB
const statuses: WorkStatus[] = ['Pipeline', 'Running', 'Completed'];

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
  sortOrder,
  onSortChange,
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
          {divisions.flatMap((d) => {
            if (d.code === 'RnB') {
              return [
                <SelectItem key={`${d.id}-road`} value="RnB-Road">
                  Road ({d.code})
                </SelectItem>,
                <SelectItem key={`${d.id}-bridge`} value="RnB-Bridge">
                  Bridge ({d.code})
                </SelectItem>
              ];
            }
            return (
              <SelectItem key={d.id} value={d.code}>
                {d.name} ({d.code})
              </SelectItem>
            );
          })}
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

      {/* Sort Button */}
      <Button
        variant="outline"
        className="h-10 font-medium"
        onClick={onSortChange}
      >
        {sortOrder === 'asc' ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />}
        UBQN
      </Button>

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