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
    case 'COMPLETED': return 'Completed';
    case 'NOT_APPLICABLE': return 'N/A';
    case 'NOT_FILLED': return '-';
    case 'PENDING': return 'Pending';
    case 'UNAVAILABLE': return ''; // Leave genuinely missing fields blank
    case 'MAPPING_ERROR': return 'ERR';
    default: return '';
  }
}

export async function renderExcel(
  reports: NormalizedWorkReport[], 
  columns: ReportColumn[], 
  context: { title: string, fileName: string }
) {
  const WorkbookClass = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook;
  const workbook = new WorkbookClass();
  const worksheet = workbook.addWorksheet('Status Report', {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
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

  // Group by R1 / R2 if mixed, otherwise just render
  const r1Works = reports.filter(r => r.work.r1r2 === 'R1');
  const r2Works = reports.filter(r => r.work.r1r2 === 'R2');
  const otherWorks = reports.filter(r => r.work.r1r2 !== 'R1' && r.work.r1r2 !== 'R2');

  const renderSection = (sectionName: string, sectionWorks: NormalizedWorkReport[], startIndex: number = 0) => {
    if (sectionWorks.length === 0) return startIndex;

    if (sectionName) {
      worksheet.mergeCells(currentRowNum, 1, currentRowNum, columns.length);
      const headerCell = worksheet.getCell(currentRowNum, 1);
      headerCell.value = sectionName;
      headerCell.font = { bold: true, size: 12, name: 'Times New Roman' };
      headerCell.alignment = centerAlign;
      for (let c = 1; c <= columns.length; c++) {
        worksheet.getCell(currentRowNum, c).border = borderThin;
      }
      worksheet.getRow(currentRowNum).height = 25;
      currentRowNum++;
    }

    sectionWorks.forEach((work, index) => {
      const row = worksheet.getRow(currentRowNum);
      const values = columns.map(c => getCellValue(work, c.key, startIndex + index));
      row.values = values;
      
      const isSpanIssue = work.work.remark?.toLowerCase().includes("span issue") || work.work.remark?.toLowerCase().includes("span");

      row.eachCell((cell, colNumber) => {
        cell.font = fontNormal;
        cell.alignment = centerAlign;
        cell.border = borderThin;

        const colKey = columns[colNumber - 1]?.key;
        if (colKey === 'span' && isSpanIssue && work.work.span) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          cell.font = { ...fontNormal, bold: true, color: { argb: 'FFFFFFFF' } };
        }
      });
      row.height = 45;
      currentRowNum++;
    });

    return startIndex + sectionWorks.length;
  };

  let globalIndex = 0;
  if (r1Works.length > 0) {
    globalIndex = renderSection('R1 (With Work Order)', r1Works, globalIndex);
  }
  if (r2Works.length > 0) {
    globalIndex = renderSection('R2 (Under Approval)', r2Works, globalIndex);
  }
  if (otherWorks.length > 0) {
    renderSection(reports.length === otherWorks.length ? '' : 'Other Works', otherWorks, globalIndex);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${context.fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
