import { useCallback, useMemo, useState } from "react";
import { type FileItem, type Solution } from "@/store/problems-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  buildWordBlob,
  downloadBlob,
  renderProblemsToWordImages,
  type WordExportLabels,
} from "@/utils/word-export";

export interface OrderedSolution {
  item: FileItem;
  solutions: Solution;
}

function nowTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function useSolutionExport(orderedSolutions: OrderedSolution[]) {
  const { t } = useTranslation("commons", { keyPrefix: "solutions" });

  const [isExportingWord, setIsExportingWord] = useState(false);

  const exportableSolutions = useMemo(
    () => orderedSolutions.filter((entry) => entry.solutions.problems.length),
    [orderedSolutions],
  );

  const buildWordLabels = useCallback((): WordExportLabels => {
    return {
      documentTitle: t("export.document-title"),
      pageHeading: (index, name) =>
        t("export.page-heading", { index, name }),
      problemHeading: (index) => t("export.problem-heading", { index }),
      problemLabel: t("export.problem-label"),
      answerLabel: t("export.answer-label"),
      explanationLabel: t("export.explanation-label"),
      problemPlaceholder: t("export.placeholders.problem"),
      answerPlaceholder: t("export.placeholders.answer"),
      explanationPlaceholder: t("export.placeholders.explanation"),
    };
  }, [t]);

  const buildMarkdownDocument = useCallback(() => {
    const lines: string[] = [];
    lines.push(`# ${t("export.document-title")}`);
    lines.push("");

    exportableSolutions.forEach((entry, pageIndex) => {
      lines.push(
        `## ${t("export.page-heading", {
          index: pageIndex + 1,
          name: entry.item.displayName,
        })}`,
      );
      lines.push("");

      entry.solutions.problems.forEach((problem, problemIdx) => {
        lines.push(
          `### ${t("export.problem-heading", { index: problemIdx + 1 })}`,
        );
        lines.push("");

        const ensureContent = (val: string | undefined | null, fb: string) =>
          val && val.trim().length > 0 ? val : fb;

        lines.push(`**${t("export.problem-label")}**`);
        lines.push("");
        lines.push(
          ensureContent(problem.problem, t("export.placeholders.problem")),
        );
        lines.push("");

        lines.push(`**${t("export.answer-label")}**`);
        lines.push("");
        lines.push(
          ensureContent(problem.answer, t("export.placeholders.answer")),
        );
        lines.push("");

        lines.push(`**${t("export.explanation-label")}**`);
        lines.push("");
        lines.push(
          ensureContent(
            problem.explanation,
            t("export.placeholders.explanation"),
          ),
        );
        lines.push("");
      });
    });

    return lines.join("\n");
  }, [exportableSolutions, t]);

  const handleExportMarkdown = useCallback(() => {
    if (!exportableSolutions.length) {
      toast.error(t("export.empty.title"), {
        description: t("export.empty.description"),
      });
      return;
    }

    try {
      const markdown = buildMarkdownDocument();
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });
      downloadBlob(blob, `${t("export.filename-prefix")}-${nowTimestamp()}.md`);

      toast.success(t("export.success.title"), {
        description: t("export.success.description"),
      });
    } catch (error) {
      console.error("Failed to export markdown", error);
      toast.error(t("export.error.title"), {
        description: t("export.error.description"),
      });
    }
  }, [buildMarkdownDocument, exportableSolutions.length, t]);

  const handleExportWord = useCallback(async () => {
    if (!exportableSolutions.length) {
      toast.error(t("export.empty.title"), {
        description: t("export.empty.description"),
      });
      return;
    }

    setIsExportingWord(true);
    try {
      const labels = buildWordLabels();
      // 1. Render each recognized problem (题干/答案/解析) into one PNG image
      const pages = await renderProblemsToWordImages(
        exportableSolutions,
        labels,
      );
      // 2. Build a printable A4 .docx where every problem is an image the
      //    user can freely resize / re-space in Word
      const blob = await buildWordBlob(pages, labels);
      downloadBlob(
        blob,
        `${t("export.filename-prefix")}-${nowTimestamp()}.docx`,
      );

      toast.success(t("export.word-success.title"), {
        description: t("export.word-success.description"),
      });
    } catch (error) {
      console.error("Failed to export Word document", error);
      toast.error(t("export.word-error.title"), {
        description: t("export.word-error.description"),
      });
    } finally {
      setIsExportingWord(false);
    }
  }, [buildWordLabels, exportableSolutions, t]);

  return {
    handleExportMarkdown,
    handleExportWord,
    isExportingWord,
    hasExportableContent: exportableSolutions.length > 0,
  };
}
