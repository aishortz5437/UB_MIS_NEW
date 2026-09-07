import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { normalizeWork } from '@/lib/reports/normalizer';
import { renderExcel } from '@/lib/reports/excelRenderer';
import { DEFAULT_REPORT_COLUMNS, getVisibleColumns } from '@/lib/reports/columns';
import type { Work } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface ExportWorksButtonProps {
  works: Work[];
  fileName?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ExportWorksButton({ works, fileName = "Running_Works", variant = "outline", size = "sm", className }: ExportWorksButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      // We simulate a tiny delay to allow UI to update to loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const normalizedWorks = works.map(normalizeWork);
      const visibleCols = getVisibleColumns(DEFAULT_REPORT_COLUMNS);
      const title = fileName.replace(/_/g, ' ').toUpperCase();

      await renderExcel(normalizedWorks, visibleCols, { title, fileName });
      
      toast({
        title: "Export Successful",
        description: `Successfully exported ${works.length} works to Excel.`,
      });
    } catch (error) {
      console.error("Failed to export:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the Excel file.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleExport}
      disabled={isExporting || works.length === 0}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Export to Excel
    </Button>
  );
}
