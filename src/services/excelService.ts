import * as XLSX from 'xlsx';
import { Question, QuizUser } from '../types';

export const parseUsersExcel = (file: File): Promise<Omit<QuizUser, 'id' | 'role'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        // Map fields based on expected headers
        const users = jsonData.map((row: any) => ({
          employeeId: String(row['Employee ID'] || row['id'] || ''),
          name: String(row['Name'] || row['name'] || ''),
          department: String(row['Department'] || row['dept'] || 'General'),
        })).filter(u => u.employeeId && u.name);

        resolve(users);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const parseQuestionsExcel = (file: File): Promise<Omit<Question, 'id'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const questions = jsonData.map((row: any, index: number) => ({
          text: String(row['Question'] || ''),
          options: {
            A: String(row['Option A'] || ''),
            B: String(row['Option B'] || ''),
            C: String(row['Option C'] || ''),
            D: String(row['Option D'] || ''),
          },
          correctAnswer: String(row['Correct Answer'] || 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D',
          order: index + 1
        })).filter(q => q.text && q.options.A);

        resolve(questions);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const exportReportsToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const downloadUserTemplate = () => {
  const data = [
    { 'Employee ID': 'EMP001', 'Name': 'John Doe', 'Department': 'Sales' },
    { 'Employee ID': 'EMP002', 'Name': 'Jane Smith', 'Department': 'Marketing' }
  ];
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Staff_Template");
  XLSX.writeFile(workbook, "Staff_Import_Template.xlsx");
};

export const downloadQuestionTemplate = () => {
  const data = [
    { 
      'Question': 'What is the capital of France?', 
      'Option A': 'London', 
      'Option B': 'Paris', 
      'Option C': 'Berlin', 
      'Option D': 'Madrid',
      'Correct Answer': 'B' 
    },
    { 
      'Question': 'Which planet is known as the Red Planet?', 
      'Option A': 'Mars', 
      'Option B': 'Venus', 
      'Option C': 'Jupiter', 
      'Option D': 'Saturn',
      'Correct Answer': 'A' 
    }
  ];
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Questions_Template");
  XLSX.writeFile(workbook, "Quiz_Questions_Template.xlsx");
};
