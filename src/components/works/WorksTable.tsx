import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import type { Work } from '@/types/database';

interface WorksTableProps {
  works: Work[];
  isLoading?: boolean;
}

export function WorksTable({ works, isLoading }: WorksTableProps) {
  if (isLoading) {
    return (
      <div className="table-container">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <div className="table-container">
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="font-medium text-slate-500">No works found in the registry.</p>
          <Link to="/works/new">
            <Button variant="outline" size="sm" className="mt-2 font-bold">
              Add your first work
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container overflow-x-auto rounded-md border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
            {/* Header 1: UBQN */}
            <TableHead className="w-24 px-4 font-bold text-slate-900 uppercase tracking-wider">UBQN</TableHead>
            
            {/* Header 2: Work Name */}
            <TableHead className="min-w-[250px] font-bold text-slate-900 uppercase tracking-wider">Work Name</TableHead>
            
            {/* Header 3: Client */}
            <TableHead className="font-bold text-slate-900 uppercase tracking-wider">Client</TableHead>
            
            {/* Header 4: Division */}
            <TableHead className="font-bold text-slate-900 uppercase tracking-wider">Division</TableHead>
            
            {/* Header 5: Status */}
            <TableHead className="font-bold text-slate-900 uppercase tracking-wider">Status</TableHead>
            
            {/* Header 6: Consultancy Cost */}
            <TableHead className="text-right font-bold pr-6 text-slate-900 uppercase tracking-wider">Consultancy Cost</TableHead>
            
            {/* Header 7: Actions */}
            <TableHead className="w-24 text-center font-bold text-slate-900 uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {works.map((work) => (
            <TableRow key={work.id} className="group transition-colors hover:bg-muted/30">
              {/* Data 1: Primary identifier .ubqn */}
              <TableCell className="px-4 font-mono text-xs font-bold text-slate-700">
                {work.ubqn}
              </TableCell>
              
              {/* Data 2: Standardized project name .work_name */}
              <TableCell className="max-w-md py-4">
                <Link
                  to={`/works/${work.id}`}
                  className="line-clamp-2 font-semibold text-slate-900 transition-colors hover:text-primary hover:underline"
                  title={work.work_name}
                >
                  {work.work_name}
                </Link>
              </TableCell>

              {/* Data 3: .client_name */}
              <TableCell className="max-w-[180px]">
                <span
                  className="line-clamp-1 text-sm text-slate-600 font-medium"
                  title={work.client_name || ''}
                >
                  {work.client_name || '-'}
                </span>
              </TableCell>

              {/* Data 4: Division Code & Subcategory */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {work.division?.code || '-'}
                  </span>
                  {work.subcategory && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tight ${
                        work.subcategory === 'Road'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {work.subcategory}
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Data 5: Capitalized status mapping */}
              <TableCell>
                <StatusBadge status={work.status} />
              </TableCell>

              {/* Data 6: Financial field .consultancy_cost */}
              <TableCell className="text-right font-mono text-sm font-black pr-6 text-blue-800">
                ₹{Number(work.consultancy_cost || 0).toLocaleString('en-IN')}
              </TableCell>

              {/* Data 7: View Details Action */}
              <TableCell>
                <div className="flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                    asChild
                  >
                    <Link to={`/works/${work.id}`}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View Details</span>
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}