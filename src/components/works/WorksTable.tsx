import { Link } from 'react-router-dom';
import { Eye, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { StatusBadge } from './StatusBadge';
import type { Work } from '@/types/database';

interface WorksTableProps {
  works: Work[];
  isLoading?: boolean;
  onDelete?: (id: string, ubqn: string) => void;
  onApproveR2?: (id: string, ubqn: string) => void;
  onRejectR2?: (id: string, ubqn: string) => void;
}

export function WorksTable({ works, isLoading, onDelete, onApproveR2, onRejectR2 }: WorksTableProps) {
  if (isLoading) {
    return (
      <div className="table-container overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
              <TableHead className="w-24 px-4 font-bold text-foreground/70 uppercase tracking-wider text-xs">UBQN</TableHead>
              <TableHead className="min-w-[250px] font-bold text-foreground/70 uppercase tracking-wider text-xs">Work Name</TableHead>
              <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Client</TableHead>
              <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Sectors</TableHead>
              <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Status</TableHead>
              <TableHead className="text-right font-bold pr-6 text-foreground/70 uppercase tracking-wider text-xs">Consultancy Cost</TableHead>
              <TableHead className="w-24 text-center font-bold text-foreground/70 uppercase tracking-wider text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell className="px-4"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="py-4"><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                <TableCell className="text-right pr-6"><div className="flex justify-end"><Skeleton className="h-4 w-24" /></div></TableCell>
                <TableCell><div className="flex justify-center"><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <div className="table-container">
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="font-medium">No works found in the registry.</p>
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
    <div className="table-container overflow-x-auto rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
            <TableHead className="w-24 px-4 font-bold text-foreground/70 uppercase tracking-wider text-xs">UBQN</TableHead>
            <TableHead className="min-w-[250px] font-bold text-foreground/70 uppercase tracking-wider text-xs">Work Name</TableHead>
            <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Client</TableHead>
            <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Sectors</TableHead>
            <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Status</TableHead>
            <TableHead className="text-right font-bold pr-6 text-foreground/70 uppercase tracking-wider text-xs">Consultancy Cost</TableHead>
            <TableHead className="w-24 text-center font-bold text-foreground/70 uppercase tracking-wider text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {works.map((work, index) => (
            <TableRow
              key={work.id}
              className="group transition-colors hover:bg-muted/30 even:bg-muted/10 border-l-2 border-l-transparent hover:border-l-primary"
            >
              {/* UBQN */}
              <TableCell className="px-4 font-mono text-xs font-bold text-muted-foreground whitespace-nowrap">
                {work.ubqn}
              </TableCell>

              {/* Work Name */}
              <TableCell className="max-w-md py-4">
                <Link
                  to={`/works/${work.id}`}
                  className="line-clamp-2 font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                  title={work.work_name}
                >
                  {work.work_name}
                </Link>
              </TableCell>

              {/* Client */}
              <TableCell className="max-w-[180px]">
                <div className="flex flex-col gap-1 items-start">
                  <span
                    className="line-clamp-1 text-sm text-muted-foreground font-medium"
                    title={work.client_name || ''}
                  >
                    {work.client_name || '-'}
                  </span>
                  {(work as any).firm === 'URBANBUILD™ Pvt. Ltd.' && (
                    <span className="shrink-0 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-[8px] font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                      Pvt. Ltd.
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight ${
                    work.division?.code?.toUpperCase() === 'ENS' 
                      ? 'bg-green-700 text-white' 
                      : work.division?.code?.toUpperCase() === 'ARCH' || work.division?.code?.toUpperCase() === 'AR'
                      ? 'bg-yellow-400 text-slate-900 border border-yellow-500/20'
                      : work.division?.code?.toUpperCase() === 'RNB'
                      ? 'text-muted-foreground'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {work.division?.code || '-'}
                  </span>
                  {work.subcategory && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tight ${work.subcategory === 'Road'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-orange-600 text-white shadow-sm'
                        }`}
                    >
                      {work.subcategory}
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Status */}
              <TableCell>
                <StatusBadge status={work.status} pendingR2={work.pending_r2_approval} />
              </TableCell>

              {/* Cost */}
              <TableCell className="text-right font-mono text-sm font-black pr-6 text-primary font-heading">
                ₹{Number(work.consultancy_cost || 0).toLocaleString('en-IN')}
              </TableCell>

              {/* Actions */}
              <TableCell>
                <div className="flex items-center justify-center">
                  {work.pending_r2_approval && onApproveR2 && onRejectR2 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onApproveR2(work.id, work.ubqn || '')}
                        className="h-8 w-8 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 transition-all mr-1"
                        title="Approve R2 Request"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span className="sr-only">Approve</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRejectR2(work.id, work.ubqn || '')}
                        className="h-8 w-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all mr-1"
                        title="Reject R2 Request"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        <span className="sr-only">Reject</span>
                      </Button>
                    </>
                  )}

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

                  {onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Work Order?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the work order <span className="font-bold text-foreground">{work.ubqn}</span> and all associated data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(work.id, work.ubqn || '')}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}