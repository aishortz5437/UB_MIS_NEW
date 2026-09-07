import ExcelJS from 'exceljs';
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('test');
ws.getRow(1).values = ['SN', 'UBQN', 'Division'];
console.log("Col A:", ws.getCell('A1').value);
console.log("Col B:", ws.getCell('B1').value);
console.log("Col C:", ws.getCell('C1').value);
