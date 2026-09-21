import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseSisuPdf } from '../pdfParser';
import { calculateWeightedGpa } from '../chartCalculations';

describe('Sisu PDF Parser Real Document Test', () => {
  it('parses Suoritusote_016286258_Lam_19092026_220803_fi.pdf with exactly 160 credits and GPA 4.32', async () => {
    const pdfPath = path.resolve(process.cwd(), 'Suoritusote_016286258_Lam_19092026_220803_fi.pdf');
    expect(fs.existsSync(pdfPath)).toBe(true);

    const data = fs.readFileSync(pdfPath).buffer;
    const result = await parseSisuPdf(data);

    console.log('--- STUDENT PROFILE ---');
    console.log(result.profile);

    console.log(`\n--- PARSED COURSES (${result.courses.length}) ---`);
    let totalCredits = 0;
    for (const c of result.courses) {
      if (c.passed) totalCredits += c.credits;
      console.log(`[${c.date}] ${c.code.padEnd(16)} ${String(c.credits).padStart(3)} op  grade: ${c.grade.padEnd(5)} passed: ${c.passed}  "${c.name}"`);
    }

    const gpa = calculateWeightedGpa(result.courses);
    console.log(`\nTOTAL CREDITS: ${totalCredits}`);
    console.log(`GPA: ${gpa?.toFixed(2)}`);

    // Verify 160 credits!
    expect(totalCredits).toBe(160);
    // Verify GPA 4.32!
    expect(gpa?.toFixed(2)).toBe('4.32');
    // Verify student metadata
    expect(result.profile.studentName).toBe('Ngoc Tony Lam');
    expect(result.profile.studentNumber).toBe('016286258');
    expect(result.profile.studyStartDate).toBe('2023-08-01');
    expect(result.profile.degreeProgramme).toBe('Tietojenkäsittelytieteen kandiohjelma');
    expect(result.profile.targetCredits).toBe(180);
  });
});
