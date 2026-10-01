#!/usr/bin/env node
// Generates docs pages, printable PDFs and downloadable copies from the .xlsx files in
// ../spreadsheets/ (themselves converted from the maintainer's Apple Numbers originals by
// sync_spreadsheets.py — CI only ever reads the .xlsx).
//
// Must run *after* sync-readme.mjs, which wipes and regenerates src/content/docs/.
//
// Outputs (all gitignored, regenerated on every dev/build):
//   src/content/docs/<slug>.md   one page per spreadsheet
//   public/downloads/*           .xlsx copies and generated .pdf files
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import pdfmake from "pdfmake";
import Helvetica from "pdfmake/standard-fonts/Helvetica.js";

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sheetsDir = resolve(siteDir, "spreadsheets");
const docsDir = resolve(siteDir, "src/content/docs");
const downloadsDir = resolve(siteDir, "public/downloads");
// Links from a page are relative (climbing out of /<slug>/) rather than absolute, so the
// SignalK plugin build, served under a base path, resolves them too.
const up = (slug) => "../".repeat(slug.split("/").length);
const downloads = (slug) => `${up(slug)}downloads`;

// Download links get a small inline file-type icon, like the README's favicon links.
// Raw <img> with a relative path into public/images (copied from docs/images by sync-readme).
function iconLink(icon, slug, file, text) {
  const img = `<img src="${up(slug)}images/icons/${icon}" width="16" height="16" alt="" style="display:inline;vertical-align:-2px">`;
  return `${img} [${text}](${downloads(slug)}/${file})`;
}
const xlsxLink = (slug, file, text) => iconLink("excel.svg", slug, file, text);
const pdfLink = (slug, file, text) => iconLink("pdf.svg", slug, file, text);
const SITE_URL = "https://boat-tech-directory.rhizomatics.org.uk";

const BOAT = "a 36' sailing boat";

pdfmake.setFonts(Helvetica);
// Everything is generated from local data; never let a document definition pull in files or
// URLs. The only "paths" pdfmake resolves are the built-in PDF standard font names.
const standardFonts = new Set(Object.values(Helvetica.Helvetica));
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((path) => standardFonts.has(path));

// ---------- xlsx helpers ----------

async function readWorkbook(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(resolve(sheetsDir, file));
  return wb;
}

function cellText(cell) {
  const v = cell?.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return String(v.result ?? "");
  }
  return String(v).replace(/\s+/g, " ").trim();
}

/** Rows of trimmed text, header row first. Trailing all-blank columns are dropped. */
function sheetRows(ws) {
  const rows = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(cellText(row.getCell(c)));
    rows.push(cells);
  });
  return rows;
}

function fillColour(cell) {
  const argb = cell?.fill?.type === "pattern" && cell.fill.pattern === "solid" ? cell.fill.fgColor?.argb : null;
  // openpyxl writes alpha 00 for opaque colours; treat "no fill" (all zero) as white.
  if (!argb || /^0{8}$/.test(argb)) return null;
  return `#${argb.slice(-6)}`;
}

// ---------- markdown helpers ----------

function mdEscape(text) {
  return String(text).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function mdTable(header, rows) {
  return [
    `| ${header.map(mdEscape).join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
    ...rows.map((r) => `| ${r.map(mdEscape).join(" | ")} |`),
  ].join("\n");
}

function writePage(slug, title, description, body) {
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    "---",
    "",
    "<!-- Generated from site/spreadsheets/*.xlsx by scripts/build-spreadsheets.mjs — do not edit directly. -->",
    "",
    "",
  ].join("\n");
  const file = resolve(docsDir, `${slug}.md`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, frontmatter + body.trim() + "\n");
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ---------- PDF helpers ----------

// A fresh node each time: pdfmake annotates nodes in place, so a shared one only renders once.
const checkbox = () => ({ canvas: [{ type: "rect", x: 0, y: 1, w: 9, h: 9, lineWidth: 0.8, lineColor: "#333333" }] });

function pdfFooter(pageUrl) {
  return (currentPage, pageCount) => ({
    columns: [
      { text: `${SITE_URL}/${pageUrl}/`, fontSize: 7, color: "#777777" },
      { text: `${currentPage} / ${pageCount}`, fontSize: 7, color: "#777777", alignment: "right" },
    ],
    margin: [36, 10, 36, 0],
  });
}

async function writePdf(file, docDefinition) {
  await pdfmake
    .createPdf({
      defaultStyle: { font: "Helvetica", fontSize: 9 },
      info: { creator: "Boat Tech Directory", producer: "pdfmake" },
      ...docDefinition,
    })
    .write(resolve(downloadsDir, file));
}

// ---------- Checklists ----------

// Which master-list columns are which checklists, in reading order. Any new Y/blank column
// added to the spreadsheet that isn't listed here still gets published, under "Other".
const CHECKLIST_GROUPS = [
  ["On the Water", ["Preparing to Sail", "After Sailing", "Heavy Weather Prep"]],
  ["At the Marina", ["Arriving on Boat", "Leaving Boat", "Pontoon Storm Prep"]],
  ["Maintenance", ["Engine Service", "Laying Up", "Hauled Out", "Splashing Prep"]],
];

async function buildChecklists() {
  const slug = "downloads/example-checklists";
  const xlsx = "example-checklists.xlsx";
  copyFileSync(resolve(sheetsDir, "checklists.xlsx"), resolve(downloadsDir, xlsx));

  const wb = await readWorkbook("checklists.xlsx");
  const [header, ...data] = sheetRows(wb.getWorksheet("Master List"));
  const col = (name) => header.indexOf(name);
  const areaCol = col("Area");
  const taskCol = col("Task");
  const tasks = data
    .filter((r) => r[taskCol])
    .map((r) => ({ area: r[areaCol] || "General", task: r[taskCol], row: r }))
    .sort((a, b) => a.area.localeCompare(b.area) || a.task.localeCompare(b.task));

  const listColumns = header.slice(col("Check") + 1).filter(Boolean);
  const known = new Set(CHECKLIST_GROUPS.flatMap(([, names]) => names));
  const groups = CHECKLIST_GROUPS.map(([g, names]) => [g, names.filter((n) => listColumns.includes(n))]);
  const other = listColumns.filter((n) => !known.has(n));
  if (other.length) groups.push(["Other", other]);

  const checklists = groups.flatMap(([group, names]) =>
    names.map((name) => ({
      group,
      name,
      file: `example-${slugify(name)}.pdf`,
      items: tasks.filter((t) => t.row[col(name)].toUpperCase() === "Y"),
    })),
  );

  // PDF content for one checklist: area shown once per group of tasks.
  const checklistPdfContent = (cl, pageBreak) => {
    let lastArea = null;
    const body = cl.items.map(({ area, task }) => {
      const first = area !== lastArea;
      lastArea = area;
      return [{ text: first ? area : "", bold: true }, task, checkbox()];
    });
    return [
      { text: cl.name, fontSize: 18, bold: true, pageBreak: pageBreak ? "before" : undefined },
      { text: `${cl.group} · ${cl.items.length} tasks · ${BOAT}`, fontSize: 8, color: "#555555", margin: [0, 2, 0, 10] },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: [80, "*", 14],
          body: [[{ text: "Area", bold: true }, { text: "Task", bold: true }, ""], ...body],
        },
        layout: {
          hLineWidth: (i) => (i <= 1 ? 0.8 : 0.3),
          vLineWidth: () => 0,
          hLineColor: () => "#999999",
          fillColor: (i) => (i === 0 ? "#E8ECEF" : null),
          paddingTop: () => 2.5,
          paddingBottom: () => 2.5,
        },
      },
    ];
  };

  for (const cl of checklists) {
    await writePdf(cl.file, {
      pageSize: "A4",
      pageMargins: [36, 36, 36, 40],
      info: { title: `${cl.name} — Example Checklist` },
      footer: pdfFooter(slug),
      content: checklistPdfContent(cl, false),
    });
  }
  await writePdf("example-checklists.pdf", {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 40],
    info: { title: "Example Checklists" },
    footer: pdfFooter(slug),
    content: checklists.flatMap((cl, i) => checklistPdfContent(cl, i > 0)),
  });

  const sections = [];
  for (const [group, names] of groups) {
    sections.push(`## ${group}`);
    for (const cl of checklists.filter((c) => c.group === group && names.includes(c.name))) {
      sections.push(
        `### ${cl.name}`,
        `${cl.items.length} tasks · ${pdfLink(slug, cl.file, "Print (PDF)")}`,
        mdTable(
          ["Area", "Task", "✓"],
          cl.items.map(({ area, task }) => [area, task, "☐"]),
        ),
      );
    }
  }

  const matrix = mdTable(
    ["Area", "Task", ...checklists.map((c) => c.name)],
    tasks.map(({ area, task, row }) => [
      area,
      task,
      ...checklists.map((c) => (row[col(c.name)].toUpperCase() === "Y" ? "✓" : "")),
    ]),
  );

  writePage(
    slug,
    "Example Checklists",
    "Example sailing boat checklists: preparing to sail, after sailing, heavy weather, leaving the boat, storm prep, laying up and haul-out.",
    `
Working checklists from ${BOAT}. Each task belongs to one or more checklists, so the whole set is kept as a single master list.

Adapt them for your own boat: download the ${xlsxLink(slug, xlsx, "spreadsheet (.xlsx)")} — it opens in Excel, Numbers, LibreOffice and Google Sheets — or print ${pdfLink(slug, "example-checklists.pdf", "all checklists (PDF)")}.

${sections.join("\n\n")}

## All Tasks

Every task, and which checklists it appears on.

${matrix}
`,
  );
  return {
    slug,
    title: "Example Checklists",
    summary: `Checklists from ${BOAT}: preparing to sail, after sailing, heavy weather, arriving and leaving the boat, storm prep, engine service, laying up, haul-out and splashing.`,
    xlsx: [[xlsx, "Checklists spreadsheet"]],
    pdf: [["example-checklists.pdf", "All checklists"], ...checklists.map((c) => [c.file, c.name])],
  };
}

// ---------- NMEA Wi-Fi gateways ----------

async function buildNmeaWifi() {
  const slug = "downloads/nmea-wifi-gateways";
  const xlsx = "nmea-wifi-gateways.xlsx";
  copyFileSync(resolve(sheetsDir, "nmea_wifi_options.xlsx"), resolve(downloadsDir, xlsx));

  const wb = await readWorkbook("nmea_wifi_options.xlsx");
  const [header, ...data] = sheetRows(wb.worksheets[0]);
  const rows = data
    .filter((r) => r.some(Boolean))
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  writePage(
    slug,
    "NMEA Wi-Fi Gateways",
    "Comparison of NMEA 0183 and NMEA 2000 to Wi-Fi gateways: ports, network load, networking, configuration, case and logging.",
    `
Off-the-shelf gateways that bridge NMEA 0183 and/or NMEA 2000 onto Wi-Fi or Ethernet, compared when choosing one for ${BOAT}.
LEN is the NMEA 2000 Load Equivalency Number (1 LEN = 50 mA).

For more vendors and open source projects, see [NMEA Interfacing](${up(slug)}open-source-projects/#nmea). Download the ${xlsxLink(slug, xlsx, "comparison spreadsheet (.xlsx)")}.

${mdTable(header, rows)}
`,
  );
  return {
    slug,
    title: "NMEA Wi-Fi Gateways",
    summary: "Comparison of NMEA 0183 and NMEA 2000 to Wi-Fi gateways.",
    xlsx: [[xlsx, "Gateway comparison spreadsheet"]],
    pdf: [],
  };
}

// ---------- Navigation templates ----------

async function buildNavigation() {
  const slug = "downloads/navigation-templates";
  const xlsx = "tidal-planner.xlsx";
  const DOWNLOADS = downloads(slug);
  const pdf = "tidal-planner.pdf";
  copyFileSync(resolve(sheetsDir, "navigation_templates.xlsx"), resolve(downloadsDir, xlsx));

  const wb = await readWorkbook("navigation_templates.xlsx");
  const ws = wb.worksheets[0];
  const rows = sheetRows(ws);
  const nCols = rows[0].length;

  // Column widths from the spreadsheet, scaled to fill an A4 landscape page.
  const pageWidth = 842 - 2 * 24;
  const raw = Array.from({ length: nCols }, (_, c) => ws.getColumn(c + 1).width || 10);
  const total = raw.reduce((a, b) => a + b, 0);
  const widths = raw.map((w) => (w / total) * pageWidth - 8); // minus cell padding
  // Row heights from the spreadsheet, scaled down (as Numbers does on export) to fit one page.
  const pageHeight = 595 - 24 - 30 - 30; // minus margins and the From/To line
  const rawHeights = rows.map((_, r) => ws.getRow(r + 1).height || 20);
  const scale = Math.min(1, pageHeight / rawHeights.reduce((a, b) => a + b, 0));
  const cellOverhead = 2 + 2 + 0.5; // pdfmake adds top/bottom padding and the rule to each row
  const heights = rawHeights.map((h) => Math.max(h * scale - cellOverhead, 10));
  const title = ws.headerFooter?.oddHeader?.replace(/&[A-Z]/g, "").trim() || "";

  const body = rows.map((r, ri) =>
    r.map((text, ci) => ({
      text,
      bold: ri === 0,
      fontSize: ri === 0 ? (widths[ci] < 36 ? 6.5 : 8) : 9, // narrow columns get smaller headings so words don't split
      fillColor: fillColour(ws.getRow(ri + 1).getCell(ci + 1)) ?? (ri === 0 ? "#C4C6C6" : null),
    })),
  );

  await writePdf(pdf, {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [24, 24, 24, 30],
    info: { title: "Tidal planner" },
    footer: pdfFooter(slug),
    content: [
      {
        // e.g. "From: To: NM ->" — spread out with room to write the passage in by hand.
        columns: title.split(/\s+/).map((t) => ({ text: t, fontSize: 11 })),
        margin: [180, 0, 0, 10],
      },
      {
        table: { headerRows: 1, widths, heights, body },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#9A9A9A",
          vLineColor: () => "#9A9A9A",
        },
      },
    ],
  });

  // On-page preview as an HTML table rather than an embedded PDF, which many browsers (and all
  // phones) won't render inline. Same source as the PDF: column widths, shading and the
  // From/To title line, with a few blank rows to show the layout.
  const PREVIEW_ROWS = 6;
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cellStyle = (ri, ci) => {
    const fill = fillColour(ws.getRow(ri + 1).getCell(ci + 1)) ?? (ri === 0 ? "#C4C6C6" : "#FFFFFF");
    return `background:${fill};color:#1d2430;border:1px solid #9a9a9a;padding:3px 4px;vertical-align:top;font-size:0.7rem;line-height:1.2;white-space:normal;overflow-wrap:normal`;
  };
  // Auto layout so no heading word overflows its cell; spreadsheet widths as proportions.
  const colgroup = raw.map((w) => `<col style="width:${((w / total) * 100).toFixed(1)}%">`).join("");
  const headerRow = rows[0]
    .map((h, ci) => `<th style="${cellStyle(0, ci)};font-weight:700;text-align:left">${esc(h)}</th>`)
    .join("");
  const bodyRows = rows
    .slice(1, 1 + PREVIEW_ROWS)
    .map((r, i) => `<tr style="height:1.8rem">${r.map((t, ci) => `<td style="${cellStyle(i + 1, ci)}">${esc(t)}</td>`).join("")}</tr>`)
    .join("\n");
  const titleLine = title
    .split(/\s+/)
    .map((t) => `<span style="flex:1">${esc(t)}</span>`)
    .join("");
  const htmlPreview = `<figure style="margin:1rem 0;min-width:0;max-width:100%">
<div style="display:flex;padding:0 0 0.5rem 15%;font-size:0.9rem">${titleLine}</div>
<div style="overflow-x:auto;max-width:100%">
<table style="display:table;width:100%;border-collapse:collapse;table-layout:auto;margin:0">
<colgroup>${colgroup}</colgroup>
<thead><tr>${headerRow}</tr></thead>
<tbody>
${bodyRows}
</tbody>
</table>
</div>
<figcaption style="font-size:0.8rem;color:var(--sl-color-gray-3)">Preview: first ${PREVIEW_ROWS} of ${rows.length - 1} rows. The PDF prints the full template on one A4 landscape page.</figcaption>
</figure>`;

  writePage(
    slug,
    "Navigation Templates",
    "Printable passage planning templates, including a tidal planner for timing tidal gates.",
    `
Printable templates used for passage planning on ${BOAT}.

## Tidal Planner

Used to find viable departure days and times for tight tidal gates such as the Mull of Kintyre: one row per candidate day, recording high water, daylight, the earliest and latest arrival that works with the stream, and the gust forecast.

${pdfLink(slug, pdf, "Print the tidal planner (PDF)")} or adapt the ${xlsxLink(slug, xlsx, "spreadsheet (.xlsx)")}.

${htmlPreview}
`,
  );
  return {
    slug,
    title: "Navigation Templates",
    summary: "Tidal planner for timing passages through tidal gates.",
    xlsx: [[xlsx, "Tidal planner spreadsheet"]],
    pdf: [[pdf, "Tidal planner"]],
  };
}

rmSync(downloadsDir, { recursive: true, force: true });
mkdirSync(downloadsDir, { recursive: true });
mkdirSync(docsDir, { recursive: true });
const built = [];
for (const build of [buildChecklists, buildNavigation, buildNmeaWifi]) {
  const page = await build();
  built.push(page);
  console.log(`build-spreadsheets: ${page.slug}.md + ${page.pdf.length} PDF(s)`);
}

// Downloads section index: every generated page and its files.
const indexSlug = "downloads";
writePage(
  indexSlug,
  "Downloads",
  "Downloadable spreadsheets and printable PDFs: example checklists, navigation templates and an NMEA Wi-Fi gateway comparison.",
  `
Spreadsheets and printable PDFs to use or adapt for your own boat. The spreadsheets open in Excel, Numbers, LibreOffice and Google Sheets.

${built
  .map(
    // Linked titles rather than headings: the sidebar already lists these pages as
    // sub-entries, and headings would repeat them in the current-page outline.
    (p) => `**[${p.title}](${up(indexSlug)}${p.slug}/)** — ${p.summary}

${[
  ...p.xlsx.map(([file, label]) => `- ${xlsxLink(indexSlug, file, label)}`),
  ...p.pdf.map(([file, label]) => `- ${pdfLink(indexSlug, file, `${label} (PDF)`)}`),
].join("\n")}`,
  )
  .join("\n\n")}
`,
);
console.log("build-spreadsheets: downloads.md");
