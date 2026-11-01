// SpreadsheetML (XLSX) writer — pure TypeScript, no external library needed.
// Produces a valid .xlsx file by writing the underlying OOXML zip structure.

import { escapeCsvCell } from "./csv";
import type { CsvRow } from "./csv";

interface XlsxSharedString {
  s: string;
  id: number;
}

// Minimal ZIP writer (store-only, no compression) using CRC32 + length prefix.
// Produces a valid ZIP that Excel reads correctly.
export function buildXlsx(rows: CsvRow[], columns: Array<{ key: string; label: string }>, sheetName = "Leads"): Uint8Array {
  const sharedStrings: XlsxSharedString[] = [];
  const sharedStringMap = new Map<string, number>();
  const getOrCreateString = (s: string): number => {
    const existing = sharedStringMap.get(s);
    if (existing !== undefined) return existing;
    const id = sharedStrings.length;
    sharedStrings.push({ s, id });
    sharedStringMap.set(s, id);
    return id;
  };

  // Build cell matrix
  const cells: Array<{ ref: string; t: "s" | "n"; v: number | string }[]> = [];
  const headerRow: { ref: string; t: "s" | "n"; v: number | string }[] = [];
  for (let c = 0; c < columns.length; c++) {
    const col = columnLetter(c);
    headerRow.push({ ref: `${col}1`, t: "s", v: getOrCreateString(columns[c].label) });
  }
  cells.push(headerRow);

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const cellRow: { ref: string; t: "s" | "n"; v: number | string }[] = [];
    for (let c = 0; c < columns.length; c++) {
      const col = columnLetter(c);
      const ref = `${col}${r + 2}`;
      const raw = row[columns[c].key];
      if (raw === null || raw === undefined || raw === "") {
        continue;
      }
      if (typeof raw === "number" && !Number.isNaN(raw)) {
        cellRow.push({ ref, t: "n", v: raw });
      } else {
        // Formula-injection safe: prefix dangerous leading chars
        let s = String(raw);
        if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
        cellRow.push({ ref, t: "s", v: getOrCreateString(s) });
      }
    }
    cells.push(cellRow);
  }

  // Build the XML files
  const sheetXml = buildSheetXml(cells);
  const sharedStringsXml = buildSharedStringsXml(sharedStrings);
  const workbookXml = buildWorkbookXml();
  const workbookRelsXml = buildWorkbookRelsXml();
  const rootRelsXml = buildRootRelsXml();
  const contentTypesXml = buildContentTypesXml();
  const sheetRelsXml = ""; // No relationships needed for plain data

  // Assemble ZIP
  const files: Array<{ name: string; data: Uint8Array }> = [
    { name: "[Content_Types].xml", data: encode(contentTypesXml) },
    { name: "_rels/.rels", data: encode(rootRelsXml) },
    { name: "xl/workbook.xml", data: encode(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels", data: encode(workbookRelsXml) },
    { name: "xl/worksheets/sheet1.xml", data: encode(sheetXml) },
    { name: "xl/sharedStrings.xml", data: encode(sharedStringsXml) },
  ];
  if (sheetRelsXml) {
    files.push({ name: "xl/worksheets/_rels/sheet1.xml.rels", data: encode(sheetRelsXml) });
  }
  void sheetName;
  return buildZip(files);
}

function columnLetter(index: number): string {
  let s = "";
  let n = index;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function buildSheetXml(cells: Array<{ ref: string; t: "s" | "n"; v: number | string }[]>): string {
  const rows: string[] = [];
  for (let r = 0; r < cells.length; r++) {
    const cellRow = cells[r];
    const cellXml = cellRow.map((c) => {
      const tAttr = c.t === "s" ? ` t="s"` : "";
      return `<c r="${c.ref}"${tAttr}><v>${escapeXml(String(c.v))}</v></c>`;
    }).join("");
    rows.push(`<row r="${r + 1}">${cellXml}</row>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rows.join("")}</sheetData>
</worksheet>`;
}

function buildSharedStringsXml(strings: XlsxSharedString[]): string {
  const items = strings.map((s) => `<si><t xml:space="preserve">${escapeXml(s.s)}</t></si>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${items}</sst>`;
}

function buildWorkbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Leads" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function buildWorkbookRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
}

function buildRootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildContentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// --- Minimal ZIP writer (store-only) ---
// ZIP format reference: PKWARE APPNOTE 6.3.x. We use version 20 (no compression).

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC32_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const fileData: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = encoder.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);      // Local file header signature
    lv.setUint16(4, 20, true);               // Version needed
    lv.setUint16(6, 0, true);                // General purpose bit flag
    lv.setUint16(8, 0, true);                // Compression method (0 = stored)
    lv.setUint16(10, 0, true);               // Mod time
    lv.setUint16(12, 0, true);               // Mod date
    lv.setUint32(14, crc, true);             // CRC-32
    lv.setUint32(18, size, true);            // Compressed size
    lv.setUint32(22, size, true);            // Uncompressed size
    lv.setUint16(26, nameBytes.length, true); // Filename length
    lv.setUint16(28, 0, true);               // Extra field length
    localHeader.set(nameBytes, 30);

    // Central directory header
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);       // Central directory header signature
    cv.setUint16(4, 20, true);               // Version made by
    cv.setUint16(6, 20, true);               // Version needed
    cv.setUint16(8, 0, true);                // General purpose
    cv.setUint16(10, 0, true);               // Compression
    cv.setUint16(12, 0, true);               // Mod time
    cv.setUint16(14, 0, true);               // Mod date
    cv.setUint32(16, crc, true);             // CRC-32
    cv.setUint32(20, size, true);            // Compressed size
    cv.setUint32(24, size, true);            // Uncompressed size
    cv.setUint16(28, nameBytes.length, true); // Filename length
    cv.setUint16(30, 0, true);               // Extra field length
    cv.setUint16(32, 0, true);               // File comment length
    cv.setUint16(34, 0, true);               // Disk number start
    cv.setUint16(36, 0, true);               // Internal file attributes
    cv.setUint32(38, 0, true);               // External file attributes
    cv.setUint32(42, offset, true);          // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    localHeaders.push(localHeader);
    fileData.push(f.data);
    centralHeaders.push(centralHeader);

    offset += localHeader.length + f.data.length;
  }

  // End of central directory record
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);          // EOCD signature
  ev.setUint16(4, 0, true);                    // Disk number
  ev.setUint16(6, 0, true);                    // Disk with central dir
  ev.setUint16(8, files.length, true);         // Entries on this disk
  ev.setUint16(10, files.length, true);        // Total entries
  ev.setUint32(12, centralHeaders.reduce((s, h) => s + h.length, 0), true); // Central dir size
  ev.setUint32(16, offset, true);              // Central dir offset
  ev.setUint16(20, 0, true);                   // Comment length

  // Concatenate
  const totalSize = localHeaders.reduce((s, h) => s + h.length, 0) +
    fileData.reduce((s, d) => s + d.length, 0) +
    centralHeaders.reduce((s, h) => s + h.length, 0) +
    eocd.length;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (let i = 0; i < files.length; i++) {
    out.set(localHeaders[i], pos); pos += localHeaders[i].length;
    out.set(fileData[i], pos); pos += fileData[i].length;
  }
  for (const h of centralHeaders) {
    out.set(h, pos); pos += h.length;
  }
  out.set(eocd, pos);

  return out;
}

// Suppress unused import warning for escapeCsvCell (kept for parity with CSV module)
void escapeCsvCell;
