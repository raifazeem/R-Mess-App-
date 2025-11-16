
import * as XLSX from 'xlsx';
import { BillItem, BillItemType, Student } from '../types';
import { format, parseISO } from 'date-fns';

interface BillSummary {
  studentId: string;
  studentName: string;
  currentBill: number;
  miscCharges: number;
  arrears: number;
  totalBill: number;
  totalSecurityFee: number;
  received: number;
  remaining: number;
}

export const exportBillToExcel = (
  students: Student[],
  billItems: BillItem[],
  startDate: Date,
  endDate: Date
): void => {
  const dateRange = `${format(startDate, 'dd-MM-yyyy')} to ${format(endDate, 'dd-MM-yyyy')}`;
  const header = `Mess Bill (${dateRange})`;

  const summaries: BillSummary[] = students.map(student => {
    const studentBillItems = billItems.filter(item => {
        const itemDate = parseISO(item.timestamp);
        return item.userId === student.id && itemDate >= startDate && itemDate <= endDate;
    });

    const currentBill = studentBillItems
        .filter(item => item.type === BillItemType.MEAL)
        .reduce((sum, item) => sum + item.amount, 0);

    const miscCharges = studentBillItems
        .filter(item => item.type === BillItemType.MISC)
        .reduce((sum, item) => sum + item.amount, 0);

    const received = -studentBillItems
        .filter(item => item.type === BillItemType.PAYMENT)
        .reduce((sum, item) => sum + item.amount, 0);
    
    const arrears = student.arrears;
    const totalSecurityFee = student.securityFee;
    
    const totalBill = currentBill + miscCharges + arrears;
    const remaining = totalBill - received;

    return {
      studentId: student.id,
      studentName: student.name,
      currentBill,
      miscCharges,
      arrears,
      totalBill,
      totalSecurityFee,
      received,
      remaining,
    };
  });

  const worksheetData = summaries.map(s => ({
    'Student Name': s.studentName,
    'Current Bill': s.currentBill,
    'Miscellaneous Charges': s.miscCharges,
    'Arrears': s.arrears,
    'Total Bill': { f: `B${summaries.indexOf(s) + 3}+C${summaries.indexOf(s) + 3}+D${summaries.indexOf(s) + 3}`, v: s.totalBill }, // Formula
    'Total Security Fee': s.totalSecurityFee,
    'Received': s.received,
    'Remaining': { f: `E${summaries.indexOf(s) + 3}-G${summaries.indexOf(s) + 3}`, v: s.remaining }, // Formula
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData, {
    header: [
      'Student Name',
      'Current Bill',
      'Miscellaneous Charges',
      'Arrears',
      'Total Bill',
      'Total Security Fee',
      'Received',
      'Remaining',
    ],
  });

  // Add the main header
  XLSX.utils.sheet_add_aoa(worksheet, [[header]], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mess Bill');

  XLSX.writeFile(workbook, `Mess_Bill_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};