import { useState } from 'react';
import { format, differenceInDays, addDays, startOfDay, min, max, isValid, parseISO } from 'date-fns';
import { CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Work } from '@/types/database';

interface GanttChartProps {
  checklist: NonNullable<Work['checklist']>;
  activeParticulars: { id: number; label: string }[];
  onUpdateDates: (itemId: number, startDate?: string, dueDate?: string) => void;
  canRevert: boolean;
}

export function GanttChart({ checklist, activeParticulars, onUpdateDates, canRevert }: GanttChartProps) {
  // Logic to calculate overall timeline bounds
  const dates = activeParticulars.flatMap(p => {
    const item = checklist[p.id];
    const itemDates = [];
    if (item?.start_date && isValid(parseISO(item.start_date))) itemDates.push(parseISO(item.start_date));
    if (item?.due_date && isValid(parseISO(item.due_date))) itemDates.push(parseISO(item.due_date));
    return itemDates;
  });

  const today = startOfDay(new Date());
  
  let minDate = dates.length > 0 ? min(dates) : today;
  let maxDate = dates.length > 0 ? max(dates) : addDays(today, 30);

  // Add padding
  minDate = addDays(minDate, -7);
  maxDate = addDays(maxDate, 14);

  const totalDays = differenceInDays(maxDate, minDate) || 1;

  const getPercentage = (date: Date) => {
    const diff = differenceInDays(date, minDate);
    return Math.max(0, Math.min(100, (diff / totalDays) * 100));
  };

  const todayPercent = getPercentage(today);

  return (
    <div className="space-y-4 overflow-x-auto pb-4">
      <div className="min-w-[800px] bg-card rounded-2xl border p-6 relative">
        {/* Timeline Header */}
        <div className="flex border-b pb-2 mb-4 relative h-6">
          <span className="absolute left-0 text-xs text-muted-foreground font-medium" style={{ left: '0%' }}>{format(minDate, 'MMM d')}</span>
          <span className="absolute text-xs text-primary font-bold z-10 bg-card px-1" style={{ left: `${todayPercent}%`, transform: 'translateX(-50%)' }}>Today</span>
          <div className="absolute top-0 bottom-[calc(-100%-500px)] h-[500px] w-px bg-primary/20 border-l border-dashed border-primary/40 z-0 pointer-events-none" style={{ left: `${todayPercent}%` }} />
          <span className="absolute right-0 text-xs text-muted-foreground font-medium" style={{ left: '100%', transform: 'translateX(-100%)' }}>{format(maxDate, 'MMM d')}</span>
        </div>

        {/* Task Rows */}
        <div className="space-y-6 relative z-10">
          {activeParticulars.map((item, index) => {
            const data = checklist[item.id] || { status: 'pending' };
            const start = data.start_date ? parseISO(data.start_date) : null;
            const due = data.due_date ? parseISO(data.due_date) : null;

            const hasDates = start && due && isValid(start) && isValid(due);
            const startPercent = hasDates ? getPercentage(start) : 0;
            const duePercent = hasDates ? getPercentage(due) : 0;
            const width = hasDates ? Math.max(duePercent - startPercent, 1) : 0;

            const isOverdue = data.status === 'pending' && due && today > due;
            const isCompleted = data.status === 'checked';

            return (
              <div key={item.id} className="group relative flex items-center h-8">
                {/* Label Area */}
                <div className="w-64 shrink-0 flex items-center justify-between pr-4 bg-card z-10 h-full">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-mono text-muted-foreground">{index + 1}.</span>
                    <span className={cn("text-xs font-medium truncate", data.status === 'na' && "line-through opacity-50")}>{item.label}</span>
                  </div>
                  {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                </div>

                {/* Timeline Area */}
                <div className="flex-1 relative h-full bg-muted/20 rounded-full group-hover:bg-muted/40 transition-colors">
                  {hasDates ? (
                    <div 
                      className={cn(
                        "absolute top-1 bottom-1 rounded-full shadow-sm flex items-center justify-center transition-all",
                        isCompleted ? "bg-green-500" : isOverdue ? "bg-red-500" : "bg-blue-500"
                      )}
                      style={{ left: `${startPercent}%`, width: `${width}%` }}
                    >
                      {width > 10 && (
                        <span className="text-[8px] font-bold text-white px-1 truncate">
                          {format(start, 'dd/MM')} - {format(due, 'dd/MM')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-muted-foreground font-medium bg-background px-2 rounded-full border shadow-sm">No dates set</span>
                    </div>
                  )}

                  {/* Edit Dates Popover */}
                  {canRevert && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DateEditor 
                        itemLabel={item.label}
                        startDate={start}
                        dueDate={due}
                        onSave={(s, d) => onUpdateDates(item.id, s, d)}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DateEditor({ itemLabel, startDate, dueDate, onSave }: { itemLabel: string, startDate: Date | null, dueDate: Date | null, onSave: (start?: string, due?: string) => void }) {
  const [start, setStart] = useState<Date | undefined>(startDate || undefined);
  const [due, setDue] = useState<Date | undefined>(dueDate || undefined);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-6 w-6 rounded-full bg-background shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground">
          <CalendarIcon className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm leading-none">{itemLabel}</h4>
          <p className="text-xs text-muted-foreground">Set timeline for this milestone.</p>
          
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-xs font-medium text-muted-foreground">Start Date</span>
              <div className="col-span-2">
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-xs",
                        !start && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {start ? format(start, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={start}
                      onSelect={setStart}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-xs font-medium text-muted-foreground">Due Date</span>
              <div className="col-span-2">
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-xs",
                        !due && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {due ? format(due, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={due}
                      onSelect={setDue}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => {
              setStart(undefined);
              setDue(undefined);
              onSave(undefined, undefined);
              setIsOpen(false);
            }} className="h-8 text-xs">Clear</Button>
            <Button size="sm" onClick={() => {
              onSave(
                start ? start.toISOString() : undefined,
                due ? due.toISOString() : undefined
              );
              setIsOpen(false);
            }} className="h-8 text-xs">Save Timeline</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
