"use client";

import { createRoot, type Root } from "react-dom/client";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { toPng } from "html-to-image";
import "katex/dist/katex.min.css";
import { Document, ImageRun, Packer, Paragraph, TextRun } from "docx";
import type { OrderedSolution } from "@/hooks/use-solution-export";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One captured problem card. dataUrl is a PNG data URL; widthPx/heightPx are
 *  the rendered CSS pixel size at 96dpi (used to size the image in the docx). */
export interface WordExportImage {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

/** One source page (one uploaded file) with all its problem images. */
export interface WordExportPage {
  name: string;
  images: WordExportImage[];
}

/** User-facing strings, supplied by the caller via i18n so this module stays
 *  language-agnostic. */
export interface WordExportLabels {
  documentTitle: string;
  pageHeading: (index: number, name: string) => string;
  problemHeading: (index: number) => string;
  problemLabel: string;
  answerLabel: string;
  explanationLabel: string;
  problemPlaceholder: string;
  answerPlaceholder: string;
  explanationPlaceholder: string;
}

// ---------------------------------------------------------------------------
// Hidden DOM rendering (each problem becomes one image)
// ---------------------------------------------------------------------------

/** Card width used for the hidden render pass. A4 at 96dpi is 794px wide;
 *  760px leaves a small margin so the captured image never exceeds the page. */
const RENDER_WIDTH_PX = 760;

const EXPORT_CSS = `
.wer-root {
  width: ${RENDER_WIDTH_PX}px;
  background: #ffffff;
  color: #111111;
  font-family: "Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif;
  font-size: 16px;
  line-height: 1.65;
  padding: 8px 0;
}
.wer-card {
  background: #ffffff;
  color: #111111;
  border: 1px solid #d8dde3;
  border-radius: 10px;
  padding: 18px 22px;
  margin: 0 0 22px 0;
}
.wer-problem-heading {
  font-size: 18px;
  font-weight: 700;
  color: #111111;
  margin: 0 0 10px 0;
}
.wer-label {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  margin: 12px 0 4px 0;
}
.wer-body {
  font-size: 15px;
  color: #111111;
}
.wer-body p { margin: 4px 0; }
.wer-body h1, .wer-body h2, .wer-body h3, .wer-body h4, .wer-body h5, .wer-body h6 {
  font-weight: 700;
  color: #111111;
  margin: 8px 0 4px 0;
}
.wer-body ul, .wer-body ol { margin: 4px 0; padding-left: 26px; }
.wer-body li { margin: 2px 0; }
.wer-body blockquote {
  margin: 6px 0;
  padding: 2px 12px;
  border-left: 3px solid #cbd5e1;
  color: #374151;
}
.wer-body pre {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  font-family: "SFMono-Regular", Consolas, "Courier New", monospace;
  font-size: 13px;
  color: #111111;
}
.wer-body code {
  font-family: "SFMono-Regular", Consolas, "Courier New", monospace;
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #111111;
}
.wer-body pre code { background: none; padding: 0; }
.wer-body table { border-collapse: collapse; margin: 6px 0; }
.wer-body th, .wer-body td { border: 1px solid #d1d5db; padding: 4px 10px; }
.wer-body img { max-width: 100%; }
.wer-body a { color: #2563eb; text-decoration: underline; }
.katex { font-size: 1.05em; }
`;

type ExportRenderProps = {
  entries: OrderedSolution[];
  labels: WordExportLabels;
};

function ensureContent(value: string | undefined | null, fallback: string) {
  return value && value.trim().length > 0 ? value : fallback;
}

function ExportRender({ entries, labels }: ExportRenderProps) {
  return (
    <div className="wer-root">
      {entries.map((entry, pageIdx) => (
        <div key={pageIdx} data-word-export-page={pageIdx}>
          {entry.solutions.problems.map((problem, problemIdx) => (
            <div
              key={problemIdx}
              data-word-export-problem={problemIdx}
              className="wer-card"
            >
              <div className="wer-problem-heading">
                {labels.problemHeading(problemIdx + 1)}
              </div>

              <div className="wer-label">{labels.problemLabel}</div>
              <div className="wer-body">
                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[[rehypeKatex, { output: "html" }]]}
                >
                  {ensureContent(problem.problem, labels.problemPlaceholder)}
                </Markdown>
              </div>

              <div className="wer-label">{labels.answerLabel}</div>
              <div className="wer-body">
                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[[rehypeKatex, { output: "html" }]]}
                >
                  {ensureContent(problem.answer, labels.answerPlaceholder)}
                </Markdown>
              </div>

              <div className="wer-label">{labels.explanationLabel}</div>
              <div className="wer-body">
                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[[rehypeKatex, { output: "html" }]]}
                >
                  {ensureContent(
                    problem.explanation,
                    labels.explanationPlaceholder,
                  )}
                </Markdown>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Wait for React to commit and fonts (KaTeX etc.) to be ready. Falls back to
 *  a timeout so a hidden/background tab never hangs the export. */
function waitForRenderSettle(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 800);
  });
}

async function captureCard(el: HTMLElement): Promise<WordExportImage> {
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
  });
  return {
    dataUrl,
    widthPx: Math.max(1, el.offsetWidth),
    heightPx: Math.max(1, el.offsetHeight),
  };
}

/** Render every problem (with answer + explanation) of every page into PNG
 *  images, one image per problem, so the user can resize each of them freely
 *  inside Word. */
export async function renderProblemsToWordImages(
  entries: OrderedSolution[],
  labels: WordExportLabels,
): Promise<WordExportPage[]> {
  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    left: "-100000px",
    top: "0px",
    width: `${RENDER_WIDTH_PX}px`,
    background: "#ffffff",
    zIndex: "-1000",
    pointerEvents: "none",
  } as Partial<CSSStyleDeclaration>);

  const styleEl = document.createElement("style");
  styleEl.textContent = EXPORT_CSS;
  host.appendChild(styleEl);

  document.body.appendChild(host);

  let root: Root | null = null;
  try {
    root = createRoot(host);
    root.render(<ExportRender entries={entries} labels={labels} />);
    await waitForRenderSettle();
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await waitForRenderSettle();

    const pages: WordExportPage[] = [];
    for (let pageIdx = 0; pageIdx < entries.length; pageIdx += 1) {
      const pageEl = host.querySelector<HTMLElement>(
        `[data-word-export-page="${pageIdx}"]`,
      );
      const images: WordExportImage[] = [];
      if (pageEl) {
        const cards = Array.from(
          pageEl.querySelectorAll<HTMLElement>(
            "[data-word-export-problem]",
          ),
        );
        for (const card of cards) {
          images.push(await captureCard(card));
        }
      }
      pages.push({ name: entries[pageIdx].item.displayName, images });
    }
    return pages;
  } finally {
    root?.unmount();
    host.remove();
  }
}

// ---------------------------------------------------------------------------
// .docx generation (A4, printable, each problem is one inline image)
// ---------------------------------------------------------------------------

const EMU_PER_PX = 9525; // 1 CSS px @ 96dpi = 9525 EMU
/** Keep images within the printable width of A4 with 19mm margins (~650px). */
const MAX_IMAGE_WIDTH_PX = 640;

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function buildWordBlob(
  pages: WordExportPage[],
  labels: WordExportLabels,
): Promise<Blob> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: labels.documentTitle,
          bold: true,
          size: 30, // 15pt
          color: "111111",
        }),
      ],
      spacing: { after: 400 },
    }),
  );

  pages.forEach((page, pageIdx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: labels.pageHeading(pageIdx + 1, page.name),
            bold: true,
            size: 24, // 12pt
            color: "111111",
          }),
        ],
        pageBreakBefore: pageIdx > 0,
        spacing: { before: pageIdx === 0 ? 0 : 480, after: 240 },
      }),
    );

    page.images.forEach((img, imgIdx) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: labels.problemHeading(imgIdx + 1),
              bold: true,
              size: 22, // 11pt
              color: "333333",
            }),
          ],
          spacing: { before: 240, after: 120 },
        }),
      );

      const scale = Math.min(1, MAX_IMAGE_WIDTH_PX / img.widthPx);
      const widthEmu = Math.round(img.widthPx * scale * EMU_PER_PX);
      const heightEmu = Math.round(img.heightPx * scale * EMU_PER_PX);

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              type: "png",
              data: dataUrlToUint8Array(img.dataUrl),
              transformation: { width: widthEmu, height: heightEmu },
            }),
          ],
          spacing: { after: 480 },
        }),
      );
    });
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Microsoft YaHei",
            size: 22, // 11pt
            color: "111111",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            // A4
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** Download a Blob as a file. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
