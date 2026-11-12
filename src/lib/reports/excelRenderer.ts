import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { NormalizedWorkReport, ReportColumn, ReportField } from './types';

function getCellValue(work: NormalizedWorkReport, key: string, index: number): string | number {
  if (key === 'sn') return index + 1;
  
  if (key in work.work) {
    const val = work.work[key as keyof typeof work.work];
    if (val === null || val === undefined) return "";
    return val;
  }
  
  if (key in work.checklist) {
    const field = work.checklist[key as keyof typeof work.checklist];
    return formatReportField(field);
  }

  if (key in work.responsibility) {
    const field = work.responsibility[key as keyof typeof work.responsibility];
    return formatReportField(field);
  }

  return "";
}

function formatReportField(field: ReportField): string {
  switch (field.status) {
    case 'DONE':
    case 'COMPLETED':
      return 'Done';
    case 'RUNNING':
      return 'Running';
    case 'NOT_APPLICABLE':
      return 'N/A';
    case 'NOT_FILLED':
    case 'PENDING':
      return '-';
    case 'UNAVAILABLE':
      return ''; // Leave genuinely missing fields blank
    case 'MAPPING_ERROR':
      return 'ERR';
    default:
      return '';
  }
}

export async function renderExcel(
  reports: NormalizedWorkReport[], 
  columns: ReportColumn[], 
  context: { title: string, fileName: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WorkbookClass = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook;
  const workbook = new WorkbookClass();
  const worksheet = workbook.addWorksheet('Status Report', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pageSetup: { paperSize: (context as any).paperSize ?? 9, orientation: 'landscape' }
  });

  const centerAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };
  const fontBold = { bold: true, name: 'Times New Roman' };
  const fontNormal = { name: 'Times New Roman' };

  // Generate Title
  worksheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = context.title.toUpperCase();
  titleCell.font = { bold: true, size: 16, name: 'Times New Roman' };
  titleCell.alignment = centerAlign;

  // Generate Date
  worksheet.mergeCells(2, 1, 2, columns.length);
  const dateCell = worksheet.getCell(2, 1);
  const today = new Date().toLocaleDateString('en-GB');
  dateCell.value = `DATE: ${today}`;
  dateCell.font = { bold: true, size: 11, name: 'Times New Roman' };
  dateCell.alignment = centerAlign;

  // Setup columns
  worksheet.columns = columns.map(c => ({ key: c.key, width: c.width || 12 }));

  // Grouping Headers
  const superGroupRow = worksheet.getRow(3);
  const groupRow = worksheet.getRow(4);
  const headerRow = worksheet.getRow(5);
  
  superGroupRow.height = 25;
  groupRow.height = 25;
  headerRow.height = 30;

  // Initialize cells
  for (let c = 1; c <= columns.length; c++) {
    [superGroupRow, groupRow, headerRow].forEach(row => {
      const cell = row.getCell(c);
      cell.border = borderThin;
      cell.font = fontBold;
      cell.alignment = centerAlign;
    });
    headerRow.getCell(c).value = columns[c - 1].header;
  }

  // Merge SuperGroup cells
  let startCol = 1;
  for (let i = 0; i <= columns.length; i++) {
    const current = columns[i]?.superGroup || "";
    const next = columns[i + 1]?.superGroup || "";
    if (i < columns.length) superGroupRow.getCell(i + 1).value = current;

    if (current !== next || i === columns.length - 1) {
      if (startCol <= i && current) worksheet.mergeCells(3, startCol, 3, i + 1);
      startCol = i + 2;
    }
  }

  // Merge Group cells
  startCol = 1;
  for (let i = 0; i <= columns.length; i++) {
    const current = columns[i]?.group || "";
    const next = columns[i + 1]?.group || "";
    if (i < columns.length) groupRow.getCell(i + 1).value = current;

    if (current !== next || i === columns.length - 1) {
      if (startCol <= i && current) worksheet.mergeCells(4, startCol, 4, i + 1);
      startCol = i + 2;
    }
  }

  // Vertical Merges & Coloring
  for (let c = 1; c <= columns.length; c++) {
    const col = columns[c - 1];
    if (!col.superGroup && !col.group) {
      worksheet.mergeCells(3, c, 5, c);
      superGroupRow.getCell(c).value = col.header;
    } else if (!col.group) {
      worksheet.mergeCells(4, c, 5, c);
      groupRow.getCell(c).value = col.header;
    }
    [superGroupRow, groupRow, headerRow].forEach(row => {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    });
  }

  let currentRowNum = 6;

  const consultancyColIndex = columns.findIndex(c => c.key === 'consultancy_cost');

  const renderSubtotalRow = (label: string, sectionWorks: NormalizedWorkReport[]) => {
    if (sectionWorks.length === 0 || consultancyColIndex === -1) return;

    const subtotalValue = sectionWorks.reduce(
      (sum, r) => sum + (Number(r.work.consultancy_cost) || 0),
      0
    );

    const subtotalRow = worksheet.getRow(currentRowNum);
    const subtotalFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    const subtotalBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' },
    };

    const targetColNum = consultancyColIndex + 1;
    if (targetColNum > 1) {
      worksheet.mergeCells(currentRowNum, 1, currentRowNum, targetColNum - 1);
      const labelCell = subtotalRow.getCell(1);
      labelCell.value = label;
    }

    const totalValCell = subtotalRow.getCell(targetColNum);
    totalValCell.value = subtotalValue;
    totalValCell.numFmt = '₹#,##,##0';

    for (let c = 1; c <= columns.length; c++) {
      const cell = subtotalRow.getCell(c);
      cell.font = { bold: true, size: 11, name: 'Times New Roman' };
      cell.alignment = centerAlign;
      cell.fill = subtotalFill;
      cell.border = subtotalBorder;
    }

    subtotalRow.height = 26;
    currentRowNum++;
  };

  const renderSection = (sectionName: string, sectionWorks: NormalizedWorkReport[], startIndex: number = 0, subtotalLabel?: string) => {
    if (sectionWorks.length === 0) return startIndex;

    if (sectionName) {
      const sectionHeaderRow = worksheet.getRow(currentRowNum);
      // Merge cells for the section header
      worksheet.mergeCells(currentRowNum, 1, currentRowNum, columns.length);
      const headerCell = worksheet.getCell(currentRowNum, 1);
      headerCell.value = sectionName;
      headerCell.font = { bold: true, size: 12, name: 'Times New Roman' };
      headerCell.alignment = centerAlign;
      // Apply distinct fill and borders based on section
      let fillColor = 'FFFFFFFF'; // default white
      if (sectionName.toUpperCase().includes('R1')) {
        fillColor = 'FFD9EAF7'; // pale blue
      } else if (sectionName.toUpperCase().includes('R2')) {
        fillColor = 'FFD9F2D9'; // pale green
      } else if (sectionName.toUpperCase().includes('PIPELINE')) {
        fillColor = 'FFFFF2CC'; // pale amber
      }
      const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      const thickBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'medium' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
      for (let c = 1; c <= columns.length; c++) {
        const cell = sectionHeaderRow.getCell(c);
        cell.fill = headerFill;
        cell.border = thickBorder;
      }
      sectionHeaderRow.height = 25;
      currentRowNum++;
    }


    sectionWorks.forEach((work, index) => {
      const row = worksheet.getRow(currentRowNum);
      const values = columns.map(c => getCellValue(work, c.key, startIndex + index));
      row.values = values;
      
      const isSpanIssue = work.work.remark?.toLowerCase().includes("span issue") || work.work.remark?.toLowerCase().includes("span");

      let maxLinesInRow = 1;

      row.eachCell((cell, colNumber) => {
        const colKey = columns[colNumber - 1]?.key;
        cell.font = fontNormal;
        cell.border = borderThin;

        if (colKey === 'remarks' || colKey === 'archRemark' || colKey === 'remark') {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } else {
          cell.alignment = centerAlign;
        }

        if ((colKey === 'consultancy_cost' || colKey === 'total_cost') && typeof cell.value === 'number') {
          cell.numFmt = '₹#,##,##0';
        }
        if (colKey === 'span' && isSpanIssue && work.work.span) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          cell.font = { ...fontNormal, bold: true, color: { argb: 'FFFFFFFF' } };
        }

        // Calculate visual line count to compute dynamic row height for clean printing
        if (cell.value !== null && cell.value !== undefined) {
          const textVal = String(cell.value);
          if (textVal.length > 0) {
            const colWidth = columns[colNumber - 1]?.width || 12;
            const splitLines = textVal.split(/\r?\n/);
            let cellLines = 0;
            for (const line of splitLines) {
              const charsPerLine = Math.max(8, Math.floor(colWidth * 0.95));
              const wrapped = Math.max(1, Math.ceil(line.length / charsPerLine));
              cellLines += wrapped;
            }
            if (cellLines > maxLinesInRow) {
              maxLinesInRow = cellLines;
            }
          }
        }
      });

      // Dynamically size row height so multi-line remarks/names are fully visible and print without cutoff.
      // Base minimum height is 45pt (for standard 1-3 lines). Clamped to 409pt (Excel's max row height).
      const calculatedHeight = Math.min(409, Math.max(45, maxLinesInRow * 15 + 12));
      row.height = calculatedHeight;
      currentRowNum++;
    });

    if (subtotalLabel) {
      renderSubtotalRow(subtotalLabel, sectionWorks);
    }

    return startIndex + sectionWorks.length;
  };

  // Check unique work categories in this report dataset
  const uniqueCategories = Array.from(new Set(reports.map(r => r.work.type || 'Other')));
  const isMultiCategory = uniqueCategories.length > 1;

  let globalIndex = 0;

  if (isMultiCategory) {
    // Render works grouped category-by-category, with subtotal at each category ending
    uniqueCategories.forEach(category => {
      const catWorks = reports.filter(r => (r.work.type || 'Other') === category);
      if (catWorks.length === 0) return;

      const catHeaderRow = worksheet.getRow(currentRowNum);
      worksheet.mergeCells(currentRowNum, 1, currentRowNum, columns.length);
      const catHeaderCell = worksheet.getCell(currentRowNum, 1);
      catHeaderCell.value = `${category.toUpperCase()} WORKS`;
      catHeaderCell.font = { bold: true, size: 13, name: 'Times New Roman' };
      catHeaderCell.alignment = centerAlign;
      const catHeaderFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      for (let c = 1; c <= columns.length; c++) {
        const cell = catHeaderRow.getCell(c);
        cell.fill = catHeaderFill;
        cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
      }
      catHeaderRow.height = 28;
      currentRowNum++;

      // Sub-sections by status within this category
      const r1 = catWorks.filter(r => r.work.r1r2 === 'R1');
      const r2 = catWorks.filter(r => r.work.r1r2 === 'R2');
      const pipe = catWorks.filter(r => r.work.status === 'Pipeline');
      const other = catWorks.filter(r => r.work.r1r2 !== 'R1' && r.work.r1r2 !== 'R2' && r.work.status !== 'Pipeline');

      const catHasMultipleSections = [r1, r2, pipe, other].filter(s => s.length > 0).length > 1;

      if (r1.length > 0) {
        globalIndex = renderSection(
          catHasMultipleSections ? `${category.toUpperCase()} - R1 (With Work Order)` : '',
          r1,
          globalIndex
        );
      }
      if (r2.length > 0) {
        globalIndex = renderSection(
          catHasMultipleSections ? `${category.toUpperCase()} - R2 (Under Approval)` : '',
          r2,
          globalIndex
        );
      }
      if (pipe.length > 0) {
        globalIndex = renderSection(
          catHasMultipleSections ? `${category.toUpperCase()} - Pipeline Works` : '',
          pipe,
          globalIndex
        );
      }
      if (other.length > 0) {
        globalIndex = renderSection(
          catHasMultipleSections ? `${category.toUpperCase()} - Other Works` : '',
          other,
          globalIndex
        );
      }

      // Render category ending subtotal
      renderSubtotalRow(`TOTAL ${category.toUpperCase()} CONSULTANCY VALUE`, catWorks);
    });
  } else {
    // Single category report - Group by status and provide section totals if multiple sections exist
    const r1Works = reports.filter(r => r.work.r1r2 === 'R1');
    const r2Works = reports.filter(r => r.work.r1r2 === 'R2');
    const pipelineWorks = reports.filter(r => r.work.status === 'Pipeline');
    const otherWorks = reports.filter(
      r => r.work.r1r2 !== 'R1' && r.work.r1r2 !== 'R2' && r.work.status !== 'Pipeline'
    );

    const activeSections = [r1Works, r2Works, pipelineWorks, otherWorks].filter(s => s.length > 0);
    const hasMultipleSections = activeSections.length > 1;

    if (r1Works.length > 0) {
      globalIndex = renderSection(
        'R1 (With Work Order)',
        r1Works,
        globalIndex,
        hasMultipleSections ? 'R1 TOTAL CONSULTANCY VALUE' : undefined
      );
    }
    if (r2Works.length > 0) {
      globalIndex = renderSection(
        'R2 (Under Approval)',
        r2Works,
        globalIndex,
        hasMultipleSections ? 'R2 TOTAL CONSULTANCY VALUE' : undefined
      );
    }
    if (pipelineWorks.length > 0) {
      globalIndex = renderSection(
        'Pipeline Works',
        pipelineWorks,
        globalIndex,
        hasMultipleSections ? 'PIPELINE TOTAL CONSULTANCY VALUE' : undefined
      );
    }
    if (otherWorks.length > 0) {
      globalIndex = renderSection(
        reports.length === otherWorks.length ? '' : 'Other Works',
        otherWorks,
        globalIndex,
        hasMultipleSections ? 'OTHER WORKS TOTAL CONSULTANCY VALUE' : undefined
      );
    }
  }

  // Render Overall Grand Total Consultancy Value row at the end of the report
  if (reports.length > 0 && consultancyColIndex !== -1) {
    const totalConsultancyValue = reports.reduce(
      (sum, r) => sum + (Number(r.work.consultancy_cost) || 0),
      0
    );
    const totalRow = worksheet.getRow(currentRowNum);
    const totalFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    const totalBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'thin' },
    };

    const targetColNum = consultancyColIndex + 1;
    if (targetColNum > 1) {
      worksheet.mergeCells(currentRowNum, 1, currentRowNum, targetColNum - 1);
      const labelCell = totalRow.getCell(1);
      labelCell.value = isMultiCategory ? 'GRAND TOTAL CONSULTANCY VALUE' : 'TOTAL CONSULTANCY VALUE';
    }

    const totalValCell = totalRow.getCell(targetColNum);
    totalValCell.value = totalConsultancyValue;
    totalValCell.numFmt = '₹#,##,##0';

    for (let c = 1; c <= columns.length; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { bold: true, size: 12, name: 'Times New Roman' };
      cell.alignment = centerAlign;
      cell.fill = totalFill;
      cell.border = totalBorder;
    }

    totalRow.height = 30;
    currentRowNum++;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${context.fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
