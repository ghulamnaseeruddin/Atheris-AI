/**
 * Atheris Documents — drafts content with Gemini, then renders it into a
 * real downloadable file per format. Public brand name stays "Atheris"
 * throughout; only this module talks to the real provider.
 */

import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type DocType = "docx" | "pptx" | "xlsx" | "pdf";

export interface DocSection {
  heading: string;
  bullets: string[];
}

/**
 * Asks Gemini for a structured outline: a title plus a list of sections,
 * each with a heading and bullet points. Plain-text protocol (headings
 * prefixed "# ", bullets prefixed "- ") keeps parsing simple and robust
 * against minor formatting drift from the model.
 */
export async function draftContent(
  topic: string,
  docType: DocType
): Promise<{ title: string; sections: DocSection[] }> {
  const styleHint =
    docType === "xlsx"
      ? "Structure it as short sections where each bullet is a single data point or row-worthy fact (keep bullets terse, like spreadsheet cells)."
      : docType === "pptx"
      ? "Structure it as slide-sized sections: one heading per slide, 3-5 short punchy bullets per slide."
      : "Structure it as a well-organized document: clear section headings, 2-6 informative bullets or points per section.";

  const prompt = `Create professional content for a ${docType.toUpperCase()} about: "${topic}"

${styleHint}

Respond in EXACTLY this plain-text format, nothing else:
TITLE: <document title>
# <section 1 heading>
- <bullet>
- <bullet>
# <section 2 heading>
- <bullet>
- <bullet>
(continue for as many sections as make sense, at least 3)`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Atheris couldn't draft that content (upstream ${res.status}).`);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseOutline(text, topic);
}

function parseOutline(raw: string, fallbackTopic: string): { title: string; sections: DocSection[] } {
  const lines = raw.split("\n").map((l) => l.trim());
  let title = fallbackTopic;
  const sections: DocSection[] = [];
  let current: DocSection | null = null;

  for (const line of lines) {
    if (line.startsWith("TITLE:")) {
      title = line.replace("TITLE:", "").trim() || fallbackTopic;
    } else if (line.startsWith("# ")) {
      if (current) sections.push(current);
      current = { heading: line.slice(2).trim(), bullets: [] };
    } else if (line.startsWith("- ") && current) {
      current.bullets.push(line.slice(2).trim());
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    // Fallback: treat the whole response as one section so generation
    // never silently fails just because the model skipped the format.
    sections.push({
      heading: "Overview",
      bullets: raw.split("\n").filter((l) => l.trim()).slice(0, 10),
    });
  }

  return { title, sections };
}

// ---------- DOCX ----------
export async function buildDocx(title: string, sections: DocSection[]): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
  ];

  for (const section of sections) {
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
    for (const bullet of section.bullets) {
      children.push(
        new Paragraph({ text: bullet, bullet: { level: 0 } })
      );
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// ---------- PPTX ----------
export async function buildPptx(title: string, sections: DocSection[]): Promise<Buffer> {
  const pptx = new PptxGenJS();

  const titleSlide = pptx.addSlide();
  titleSlide.addText(title, {
    x: 0.5,
    y: 2.2,
    w: 9,
    h: 1.5,
    fontSize: 36,
    bold: true,
    align: "center",
  });

  for (const section of sections) {
    const slide = pptx.addSlide();
    slide.addText(section.heading, { x: 0.5, y: 0.4, w: 9, h: 0.8, fontSize: 26, bold: true });
    slide.addText(
      section.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      { x: 0.6, y: 1.4, w: 8.8, h: 4.5, fontSize: 18 }
    );
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}

// ---------- XLSX ----------
export async function buildXlsx(title: string, sections: DocSection[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31) || "Sheet1");

  sheet.columns = [
    { header: "Section", key: "section", width: 28 },
    { header: "Point", key: "point", width: 60 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const section of sections) {
    for (const bullet of section.bullets) {
      sheet.addRow({ section: section.heading, point: bullet });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ---------- PDF ----------
export async function buildPdf(title: string, sections: DocSection[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function wrapText(text: string, size: number, f: typeof font): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(test, size) > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function ensureSpace(lineHeight: number) {
    if (y - lineHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function drawLine(text: string, size: number, f: typeof font, color = rgb(0.1, 0.1, 0.1)) {
    for (const line of wrapText(text, size, f)) {
      ensureSpace(size + 6);
      page.drawText(line, { x: margin, y, size, font: f, color });
      y -= size + 6;
    }
  }

  drawLine(title, 24, boldFont);
  y -= 10;

  for (const section of sections) {
    ensureSpace(30);
    drawLine(section.heading, 16, boldFont);
    y -= 2;
    for (const bullet of section.bullets) {
      drawLine(`•  ${bullet}`, 11, font);
    }
    y -= 10;
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export async function buildDocument(
  docType: DocType,
  title: string,
  sections: DocSection[]
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  switch (docType) {
    case "docx":
      return {
        buffer: await buildDocx(title, sections),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        extension: "docx",
      };
    case "pptx":
      return {
        buffer: await buildPptx(title, sections),
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        extension: "pptx",
      };
    case "xlsx":
      return {
        buffer: await buildXlsx(title, sections),
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: "xlsx",
      };
    case "pdf":
      return {
        buffer: await buildPdf(title, sections),
        mimeType: "application/pdf",
        extension: "pdf",
      };
  }
}
