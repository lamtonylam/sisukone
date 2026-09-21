import { describe, it, expect } from 'vitest';
import {
  parseCourseFromLine,
  parseRawTranscriptText,
  parseStandardDate,
  isModuleHeader,
} from '../textParser';

describe('textParser - Sisu Transcript Parsing Engine', () => {
  describe('parseStandardDate', () => {
    it('parses European date format DD.MM.YYYY', () => {
      expect(parseStandardDate('Completed on 15.09.2021')).toBe('2021-09-15');
      expect(parseStandardDate('1.5.2022')).toBe('2022-05-01');
    });

    it('parses ISO date format YYYY-MM-DD', () => {
      expect(parseStandardDate('Completed on 2023-11-20')).toBe('2023-11-20');
      expect(parseStandardDate('2024/03/05')).toBe('2024-03-05');
    });

    it('returns null for invalid dates', () => {
      expect(parseStandardDate('No dates here')).toBeNull();
      expect(parseStandardDate('99.99.99999')).toBeNull();
    });
  });

  describe('isModuleHeader', () => {
    it('identifies Finnish and English study module aggregate headers', () => {
      expect(isModuleHeader('Perusopinnot 25 op')).toBe(true);
      expect(isModuleHeader('Tietojenkäsittelytieteen aineopinnot 60 op')).toBe(true);
      expect(isModuleHeader('Basic Studies in Computer Science 25 cr')).toBe(true);
      expect(isModuleHeader('Syventävät opinnot')).toBe(true);
      expect(isModuleHeader('Yhteensä 180 op')).toBe(true);
      expect(isModuleHeader('Total: 120 credits')).toBe(true);
    });

    it('does not flag standard courses as module headers', () => {
      expect(isModuleHeader('TKT10001 Ohjelmoinnin perusteet')).toBe(false);
      expect(isModuleHeader('CS-E4000 Machine Learning')).toBe(false);
    });
  });

  describe('parseCourseFromLine - Language & Layout Edge Cases', () => {
    it('parses standard Finnish Sisu format', () => {
      const line = 'TKT10001 Ohjelmoinnin perusteet 5 op 5 15.10.2021';
      const course = parseCourseFromLine(line, 0);

      expect(course).not.toBeNull();
      expect(course?.code).toBe('TKT10001');
      expect(course?.name).toContain('Ohjelmoinnin perusteet');
      expect(course?.credits).toBe(5);
      expect(course?.grade).toBe('5');
      expect(course?.date).toBe('2021-10-15');
      expect(course?.passed).toBe(true);
    });

    it('parses standard English Sisu format with decimal credits and Pass grade', () => {
      const line = 'CS-E4000 Advanced Machine Learning 5.0 cr Pass 2023-05-12';
      const course = parseCourseFromLine(line, 1);

      expect(course).not.toBeNull();
      expect(course?.code).toBe('CS-E4000');
      expect(course?.name).toContain('Advanced Machine Learning');
      expect(course?.credits).toBe(5);
      expect(course?.grade).toBe('PASS');
      expect(course?.date).toBe('2023-05-12');
      expect(course?.passed).toBe(true);
    });

    it('parses Swedish Sisu format with sp (studiepoäng) and Godkänd', () => {
      const line = 'MAT11001 Grunderna i matematik 10 sp Godkänd 01.12.2022';
      const course = parseCourseFromLine(line, 2);

      expect(course).not.toBeNull();
      expect(course?.code).toBe('MAT11001');
      expect(course?.name).toContain('Grunderna i matematik');
      expect(course?.credits).toBe(10);
      expect(course?.grade).toBe('GODKÄND');
      expect(course?.date).toBe('2022-12-01');
      expect(course?.passed).toBe(true);
    });

    it('handles fractional / decimal credits with comma (e.g. 1,5 op)', () => {
      const line = 'KK-ENG101 Academic Writing 1,5 op 4 10.05.2022';
      const course = parseCourseFromLine(line, 3);

      expect(course).not.toBeNull();
      expect(course?.credits).toBe(1.5);
      expect(course?.grade).toBe('4');
    });

    it('handles fail grades (HYL, 0, Fail, Hylätty) and marks passed as false', () => {
      const failLine1 = 'TKT20005 Laskennan mallit 5 op HYL 12.05.2023';
      const course1 = parseCourseFromLine(failLine1, 4);
      expect(course1?.passed).toBe(false);
      expect(course1?.grade).toBe('HYL');

      const failLine2 = 'FYS1001 Fysiikka I 5 op 0 15.01.2022';
      const course2 = parseCourseFromLine(failLine2, 5);
      expect(course2?.passed).toBe(false);
      expect(course2?.grade).toBe('0');
    });

    it('parses Sisu parenthesized course code format', () => {
      const line = 'Johdatus logiikkaan I (MAT21014) 5 op en 5 12.3.2026';
      const course = parseCourseFromLine(line, 0);

      expect(course).not.toBeNull();
      expect(course?.code).toBe('MAT21014');
      expect(course?.name).toBe('Johdatus logiikkaan I');
      expect(course?.credits).toBe(5);
      expect(course?.grade).toBe('5');
      expect(course?.date).toBe('2026-03-12');
      expect(course?.passed).toBe(true);
    });

    it('parses transferred course with external code and asterisk', () => {
      const line = 'GIT Open (3iyj-xsi2) * 3 op fi Hyv. 13.5.2024';
      const course = parseCourseFromLine(line, 0);

      expect(course).not.toBeNull();
      expect(course?.code).toBe('3iyj-xsi2');
      expect(course?.name).toBe('GIT Open');
      expect(course?.credits).toBe(3);
      expect(course?.grade).toBe('HYV');
      expect(course?.date).toBe('2024-05-13');
    });

    it('parses course with purely numeric code', () => {
      const line = 'Kauppaoikeuden valinnaiset opinnot (20200) 2 op fi Hyv. 14.8.2023';
      const course = parseCourseFromLine(line, 0);

      expect(course).not.toBeNull();
      expect(course?.code).toBe('20200');
      expect(course?.name).toBe('Kauppaoikeuden valinnaiset opinnot');
      expect(course?.credits).toBe(2);
      expect(course?.grade).toBe('HYV');
      expect(course?.date).toBe('2023-08-14');
    });

    it('parses course with short suffix code like DIGI-A', () => {
      const line = 'Opiskelijan digitaidot: orientaatio (DIGI-A) 2 op fi Hyv. 15.8.2023';
      const course = parseCourseFromLine(line, 0);

      expect(course).not.toBeNull();
      expect(course?.code).toBe('DIGI-A');
      expect(course?.name).toBe('Opiskelijan digitaidot: orientaatio');
      expect(course?.credits).toBe(2);
      expect(course?.grade).toBe('HYV');
    });

    it('preserves Finnish non-ASCII characters without mangling names or grades', () => {
      const line = 'Lukiolähettiläs 1 (TKT50010) 1 op fi Hyv. 10.11.2023';
      const course = parseCourseFromLine(line, 0);

      expect(course).not.toBeNull();
      expect(course?.code).toBe('TKT50010');
      expect(course?.name).toBe('Lukiolähettiläs 1');
      expect(course?.credits).toBe(1);
      expect(course?.grade).toBe('HYV');
    });

    it('handles multiline wrapped course entry with code and CEFR on continuation line', () => {
      const line1 = 'Academic and Professional Communication in English 1 & 2 4 op en Hyv. 5.12.2024';
      const line2 = '(CEFR B2) (KK-ENKAIKKI)';
      const course = parseCourseFromLine(line1, 0, line2);

      expect(course).not.toBeNull();
      expect(course?.code).toBe('KK-ENKAIKKI');
      expect(course?.name).toBe('Academic and Professional Communication in English 1 & 2 (CEFR B2)');
      expect(course?.credits).toBe(4);
      expect(course?.grade).toBe('HYV');
      expect(course?.date).toBe('2024-12-05');
    });

    it('ignores empty lines or lines with insufficient information', () => {
      expect(parseCourseFromLine('', 0)).toBeNull();
      expect(parseCourseFromLine('   ', 0)).toBeNull();
      expect(parseCourseFromLine('Page 1 of 3', 0)).toBeNull();
      expect(parseCourseFromLine('Helsingin yliopisto - Opintosuoritusote', 0)).toBeNull();
    });
  });

  describe('parseRawTranscriptText - Full Document Parsing', () => {
    it('parses full multi-line transcript with headers, metadata and courses', () => {
      const raw = `
HELSINGIN YLIOPISTO
OPINTOSUORITUSOTE
Opiskelijanumero: 015998877
Nimi: Opiskelija Testi
Opinto-oikeus alkoi: 01.08.2021
Koulutusohjelma: Tietojenkäsittelytieteen kandiohjelma

Perusopinnot 25 op
TKT10001 Ohjelmoinnin perusteet 5 op 5 15.10.2021
TKT10002 Ohjelmoinnin jatkokurssi 5 op 4 18.12.2021
TKT10003 Tietokantojen perusteet 5 op 5 10.03.2022

Aineopinnot 60 op
TKT20001 Tietorakenteet ja algoritmit 10 op 5 25.10.2022
KK-ENG301 English Academic Writing 4 op HYV 20.05.2022

Yhteensä: 29 op
      `;

      const result = parseRawTranscriptText(raw);

      expect(result.studentNumber).toBe('015998877');
      expect(result.studyStartDate).toBe('2021-08-01');
      expect(result.degreeProgramme).toContain('Tietojenkäsittelytieteen kandiohjelma');
      expect(result.courses).toHaveLength(5);

      // Verify no module headers were included as courses
      expect(result.courses.some((c) => c.code.includes('Perusopinnot'))).toBe(false);
      expect(result.courses.some((c) => c.code.includes('Aineopinnot'))).toBe(false);

      // Verify sorting
      expect(result.courses[0].code).toBe('TKT10001');
      expect(result.courses[result.courses.length - 1].code).toBe('TKT20001');
    });

    it('deduplicates identical courses with same code and date', () => {
      const duplicateRaw = `
TKT10001 Ohjelmoinnin perusteet 5 op 5 15.10.2021
TKT10001 Ohjelmoinnin perusteet 5 op 5 15.10.2021
      `;
      const result = parseRawTranscriptText(duplicateRaw);
      expect(result.courses).toHaveLength(1);
    });

    it('extracts study start date from Aloituspäivä, Voimassa, and Startdatum formats', () => {
      const fiFormat = `
TIETOJENKÄSITTELYTIETEEN KANDIOHJELMA JA MAISTERIOHJELMA (3V + 2V)
Koulutuksen tyyppi       Alempi ja ylempi tutkintokoulutus
Voimassa                 1.8.2023-31.7.2030
Aloituspäivä             1.8.2023
Opiskeluoikeuden tila    Aktiivinen
      `;
      expect(parseRawTranscriptText(fiFormat).studyStartDate).toBe('2023-08-01');

      const voimassaOnly = `
TIETOJENKÄSITTELYTIETEEEN KANDIOHJELMA
Voimassa: 01.08.2023 - 31.07.2026
      `;
      expect(parseRawTranscriptText(voimassaOnly).studyStartDate).toBe('2023-08-01');

      const svFormat = `
KANDIDATPROGRAMMET I DATAVETENSKAP
Startdatum: 1.8.2024
      `;
      expect(parseRawTranscriptText(svFormat).studyStartDate).toBe('2024-08-01');

      const multiline = `
Aloituspäivä
01.09.2022
      `;
      expect(parseRawTranscriptText(multiline).studyStartDate).toBe('2022-09-01');
    });
  });
});

