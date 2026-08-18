"use client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Info, StarIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAiStore } from "@/store/ai-store";
import ActionsCard from "../actions/ActionsCard";
import PreviewCard from "../preview/PreviewCard";

import solvePrompt from "@/ai/prompts/solve.prompt.md";
import segmentPrompt from "@/ai/prompts/segment.prompt.md";

import { uint8ToBase64 } from "@/utils/encoding";
import { parseSolveResponse } from "@/ai/response";
import { parseSegmentResponse } from "@/ai/segment";
import { compressImageForAI } from "@/utils/image-compression";

import {
  type FileItem,
  type ProblemSolution,
  useProblemsStore
} from "@/store/problems-store";
import SolutionsArea from "../solutions/SolutionsArea";
import { useSettingsStore } from "@/store/settings-store";
import { processImage } from "@/utils/image-post-processing";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useShortcut } from "@/hooks/use-shortcut";
import OpenCVLoader from "../OpenCVLoader";
import { getEnabledToolCallingPrompts } from "@/ai/prompts/prompt-manager";
import { useStoreInitialization } from "@/hooks/use-store-initialization";
import { isTextMimeType } from "@/utils/file-utils";
import { isNonRetryableError, NonRetryableError } from "@/ai/errors";

export default function ScanPage() {
  const { t } = useTranslation("commons", { keyPrefix: "scan-page" });
  const router = useRouter();
  // Destructure all necessary state and new semantic actions from the store.
  const {
    imageItems: items,
    addFileItems,
    updateItemStatus,
    removeImageItem,
    updateFileItem,
    clearAllItems,
    setSelectedProblem,
    addSolution,
    updateSolution,
    removeSolutionsByIds,
    clearAllSolutions,
    appendStreamedOutput,
    clearStreamedOutput
  } = useProblemsStore((s) => s);
  const isStoreReady = useStoreInitialization();

  const { imageEnhancement, traits, onlineSearchEnabled, twoStageEnabled, fastModelName } =
    useSettingsStore((s) => s);

  // Zustand store for AI provider configuration.
  const {
    sources,
    activeSourceId,
    currentModel,
    fallbackModel,
    fallbackSourceId,
    isCustomFallback,
    customFallbackSourceId,
    getClientForSource
  } = useAiStore((s) => s);
  const allowPdfUploads = useAiStore((state) => state.allowPdfUpload());

  const activeSource = useMemo(() => {
    return sources.find(
      (source) =>
        source.id === activeSourceId && source.enabled && Boolean(source.apiKey)
    );
  }, [sources, activeSourceId]);

  // Resolve the actual fallback source ID (custom or from model selection)
  const resolvedFallbackSourceId = useMemo(() => {
    if (isCustomFallback) {
      return customFallbackSourceId || null;
    }
    return fallbackSourceId;
  }, [isCustomFallback, customFallbackSourceId, fallbackSourceId]);

  // State to track if the AI is currently processing images.
  const setWorking = useProblemsStore((s) => s.setWorking);

  const isMobile = useMediaQuery("(max-width: 640px)");
  const [activeTab, setActiveTab] = useState<"capture" | "preview">(
    items.length ? "preview" : "capture"
  );
  useShortcut(
    "openChat",
    (event) => {
      event.preventDefault();
      router.push("/chat");
    },
    [router]
  );

  useEffect(() => {
    if (!items.length) {
      setActiveTab("capture");
    }
  }, [items.length]);

  // Memoized calculation of the total size of all uploaded files.
  const totalBytes = useMemo(
    () => items.reduce((sum, it) => sum + it.file.size, 0),
    [items]
  );

  useEffect(() => {
    window.addEventListener("beforeunload", (e) => {
      if (items.length > 0) {
        e.preventDefault();
      }
    });
  }, [items.length]);

  // Callback to add new files to the items list using the store action.
  const appendFiles = useCallback(
    (files: File[] | FileList, source: FileItem["source"]) => {
      let rejectedPdf = false;
      const arr = Array.from(files).filter((f) => {
        if (f.type.startsWith("image/")) {
          return true;
        }

        if (isTextMimeType(f.type, f.name)) {
          return true;
        }

        if (f.type === "application/pdf") {
          if (allowPdfUploads) {
            return true;
          }
          rejectedPdf = true;
          return false;
        }

        toast(t("toasts.unsupported-file.title"), {
          description: t("toasts.unsupported-file.description", {
            mimeType: f.type
          })
        });
        return false;
      });

      if (rejectedPdf) {
        toast(t("toasts.pdf-blocked.title"), {
          description: t("toasts.pdf-blocked.description")
        });
      }

      if (arr.length === 0) return;

      const initialItems: FileItem[] = arr.map((file) => ({
        id: uuidv4(),
        file,
        displayName: file.name,
        mimeType: file.type,
        url: URL.createObjectURL(file),
        source,
        status:
          file.type.startsWith("image/") && imageEnhancement
            ? "processing"
            : "pending"
      }));

      addFileItems(initialItems);

      // Image post-processing
      if (imageEnhancement) {
        initialItems.forEach((item) => {
          if (item.status === "processing") {
            console.log(`Processing image ${item.displayName}`);
            processImage(item.file)
              .then((result) => {
                console.log(`Success processed image ${item.displayName}`);
                updateFileItem(item.id, {
                  status: "pending",
                  file: result.file,
                  url: result.url
                });
              })
              .catch((error) => {
                console.error(`Failed to process ${item.displayName}:`, error);
                updateFileItem(item.id, {
                  status: "failed"
                });
              });
          }
        });
      }
    },
    [addFileItems, imageEnhancement, allowPdfUploads, t, updateFileItem]
  );

  // Function to remove a specific item from the list by its ID.
  const removeItem = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (target) URL.revokeObjectURL(target.url); // Clean up the object URL.
    // Use the semantic action to remove the item.
    removeImageItem(id);
  };

  // Function to clear all uploaded items and solutions.
  const clearAll = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url)); // Clean up all object URLs.
    clearAllItems();
    // reset index
    setSelectedProblem(0);
    clearAllSolutions(); // Use the semantic action to clear solutions.
  };

  const retryAsyncOperation = async (
    asyncFn: (model: string, sourceId?: string) => Promise<string>,
    sourceName: string,
    primaryModel: string,
    primarySourceId: string,
    fallbackModelName: string | null,
    fallbackSourceIdParam: string | null,
    maxRetries: number = 2,
    initialDelayMs: number = 2000
  ): Promise<string> => {
    // Helper function to run a single model's retry loop
    const runWithRetry = async (
      model: string,
      sourceId: string | undefined,
      logPrefix: string
    ): Promise<{ result: string } | { error: Error }> => {
      let lastError: Error | undefined;
      let delay = initialDelayMs;

      for (let attempt = 1; attempt <= Math.max(1, maxRetries); ++attempt) {
        try {
          return { result: await asyncFn(model, sourceId) };
        } catch (error) {
          lastError = error as Error;

          if (isNonRetryableError(error)) {
            return { error: lastError };
          }

          const errorMessage = lastError?.message || String(error);
          console.log(
            `${logPrefix} attempt ${attempt} failed. Retrying in ${delay / 1000}s...`
          );

          if (attempt < Math.max(1, maxRetries)) {
            toast.warning(t("toasts.retry.title"), {
              description: t("toasts.retry.description", {
                attempt,
                error: errorMessage.slice(0, 100),
                delay: Math.round(delay / 1000)
              })
            });
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay = Math.min(delay * 2, 8000); // Cap backoff so a bad run cannot stall the batch for minutes
          }
        }
      }

      return { error: lastError ?? new Error("Unknown AI failure") };
    };

    // Try with primary model first
    const primaryResult = await runWithRetry(
      primaryModel,
      primarySourceId,
      "Primary model"
    );
    if ("result" in primaryResult) {
      return primaryResult.result;
    }

    // Check if primary error is non-retryable
    if (isNonRetryableError(primaryResult.error)) {
      throw primaryResult.error;
    }

    // Primary model exhausted, try fallback model if available
    // Use fallback source if specified (for cross-provider fallback), otherwise use primary source
    if (fallbackModelName) {
      const effectiveFallbackSourceId =
        fallbackSourceIdParam ?? primarySourceId;

      toast.info(t("toasts.fallback.title"), {
        description: t("toasts.fallback.description", {
          model: fallbackModelName
        })
      });

      const fallbackResult = await runWithRetry(
        fallbackModelName,
        effectiveFallbackSourceId,
        "Fallback"
      );
      if ("result" in fallbackResult) {
        return fallbackResult.result;
      }

      // Check if fallback error is non-retryable
      if (isNonRetryableError(fallbackResult.error)) {
        throw fallbackResult.error;
      }
    }

    // All retries exhausted
    if (maxRetries > 0) {
      toast.error(t("toasts.retry-exhausted.title"), {
        description: t("toasts.retry-exhausted.description", {
          source: sourceName,
          maxRetries
        })
      });
    }

    throw primaryResult.error;
  };

  /**
   * Main function to start the scanning process.
   * Uses the active AI source to process items.
   */
  const startScan = async () => {
    if (!activeSource) {
      toast(t("toasts.no-source.title"), {
        description: t("toasts.no-source.description")
      });
      return;
    }

    if (!currentModel || currentModel.length === 0) {
      toast(t("toasts.no-model.title"), {
        description: t("toasts.no-model.description", {
          provider: activeSource.name
        })
      });
      return;
    }

    if (items.filter((item) => item.status === "processing").length !== 0) {
      toast(t("toasts.post-processing.title"), {
        description: t("toasts.post-processing.description")
      });
      return;
    }

    const itemsToProcess = items.filter(
      (item) => item.status === "pending" || item.status === "failed"
    );

    if (itemsToProcess.length === 0) {
      toast(t("toasts.all-processed.title"), {
        description: t("toasts.all-processed.description")
      });
      return;
    }

    const hasPdfItems = itemsToProcess.some(
      (item) => item.mimeType === "application/pdf"
    );

    if (hasPdfItems && !allowPdfUploads) {
      toast(t("toasts.pdf-blocked.title"), {
        description: t("toasts.pdf-blocked.description")
      });
      return;
    }

    toast(t("toasts.working.title"), {
      description: t("toasts.working.description", {
        count: itemsToProcess.length
      })
    });
    setWorking(true);

    try {
      const concurrency = 2;
      const n = itemsToProcess.length;

      const idsToProcess = new Set(itemsToProcess.map((item) => item.id));
      removeSolutionsByIds(idsToProcess);

      const processOne = async (item: FileItem) => {
        console.log(`Processing ${item.id}`);

        // 1. Compress first: full-res photos are the #1 upload bottleneck.
        // Downscaling to ~1600px JPEG cuts payload 10-50x with no OCR loss.
        const compressed = await compressImageForAI(item.file);
        const buf = await compressed.blob.arrayBuffer();
        const base64 = await uint8ToBase64(new Uint8Array(buf));
        const mimeType = compressed.mimeType;

        updateSolution(item.id, {
          status: "processing"
        });

        const promptPrompt = activeSource.traits
          ? `\nUser defined prompts:
<prompt>
${activeSource.traits}
</prompt>
`
          : "";

        const traitsPrompt = traits
          ? `\nUser defined traits:
<traits>
${traits}
</traits>
`
          : "";

        const solveSystemPrompt = solvePrompt + promptPrompt + traitsPrompt;

        // Retry wrapper with sane defaults (capped quick retries, no minutes-long backoff)
        const sendWithRetry = (
          asyncFn: (model: string, sourceId?: string) => Promise<string>
        ) =>
          retryAsyncOperation(
            asyncFn,
            activeSource.name,
            currentModel,
            activeSource.id,
            fallbackModel,
            resolvedFallbackSourceId,
            Math.min(activeSource.maxRetries ?? 2, 3)
          );

        // Full-page image solve (used by the fallback single-pass path)
        const sendImage = (
          systemPromptText: string,
          userPrompt?: string
        ) =>
          sendWithRetry((modelName, sourceId) => {
            const client = sourceId
              ? getClientForSource(sourceId)
              : getClientForSource(activeSource.id);
            if (!client) {
              throw new Error(t("errors.no-client"));
            }
            client.addSystemPrompt(systemPromptText);
            client.setAvailableTools(getEnabledToolCallingPrompts());
            return client.sendMedia(
              {
                data: base64,
                mimeType,
                name: item.displayName
              },
              userPrompt,
              modelName,
              (text) => appendStreamedOutput(item.id, text),
              { onlineSearch: onlineSearchEnabled }
            );
          });

        clearStreamedOutput(item.id);

        let problems: ProblemSolution[] = [];

        // --- Stage 1: fast OCR / question segmentation (images only) ---
        const isImage = item.mimeType.startsWith("image/");
        let questionTexts: string[] | null = null;

        if (isImage && twoStageEnabled) {
          try {
            const ocrModel = fastModelName.trim() || currentModel;
            const ocrText = await retryAsyncOperation(
              (model, sourceId) => {
                const client = sourceId
                  ? getClientForSource(sourceId)
                  : getClientForSource(activeSource.id);
                if (!client) {
                  throw new Error(t("errors.no-client"));
                }
                // Keep the OCR prompt minimal and fast: no tools, no traits
                client.addSystemPrompt(segmentPrompt);
                return client.sendMedia(
                  {
                    data: base64,
                    mimeType,
                    name: item.displayName
                  },
                  undefined,
                  model,
                  (text) => appendStreamedOutput(item.id, text),
                  { onlineSearch: false }
                );
              },
              activeSource.name,
              ocrModel,
              activeSource.id,
              null, // no fallback model for the cheap OCR stage
              null,
              2, // best effort: at most one retry, then fall back to single-pass
              1500
            );
            questionTexts = parseSegmentResponse(ocrText);
            console.log(
              `OCR stage for ${item.id}: ${questionTexts?.length ?? 0} questions`
            );
          } catch (err) {
            console.warn(
              `OCR stage failed for ${item.id}, falling back:`,
              err
            );
            questionTexts = null;
          }
        }

        if (
          questionTexts &&
          questionTexts.length > 0 &&
          questionTexts.length <= 8
        ) {
          // --- Stage 2: solve each question independently, in parallel ---
          const solveOne = async (question: string): Promise<ProblemSolution> => {
            const solveText = await sendWithRetry((model, sourceId) => {
              const client = sourceId
                ? getClientForSource(sourceId)
                : getClientForSource(activeSource.id);
              if (!client) {
                throw new Error(t("errors.no-client"));
              }
              client.addSystemPrompt(solveSystemPrompt);
              client.setAvailableTools(getEnabledToolCallingPrompts());
              if (!client.sendChat) {
                throw new Error(t("errors.no-client"));
              }
              return client.sendChat(
                [
                  {
                    role: "user",
                    content: `${t("two-stage.solve-instruction")}\n\n${question}`
                  }
                ],
                model,
                (text) => appendStreamedOutput(item.id, text),
                { onlineSearch: onlineSearchEnabled }
              );
            });

            const parsed = parseSolveResponse(solveText);
            if (!parsed || parsed.problems.length === 0) {
              throw new Error(t("errors.parsing-failed"));
            }
            return parsed.problems[0];
          };

          const solveConcurrency = Math.min(3, questionTexts.length);
          const solved: ProblemSolution[] = new Array(questionTexts.length);
          let nextQ = 0;
          const solveWorker = async () => {
            while (true) {
              const i = nextQ++;
              if (i >= questionTexts.length) break;
              try {
                solved[i] = await solveOne(questionTexts[i]);
              } catch (err) {
                solved[i] = {
                  problem: t("errors.processing-failed.problem"),
                  answer: t("errors.processing-failed.answer"),
                  explanation: t("errors.processing-failed.explanation", {
                    error: String(err)
                  }),
                  steps: []
                };
              }
            }
          };
          await Promise.all(
            Array(solveConcurrency)
              .fill(0)
              .map(() => solveWorker())
          );
          problems = solved;
        }

        // --- Fallback: single-pass full-page solve (PDF / text / OCR failure) ---
        if (problems.length === 0) {
          let resText = await sendImage(solveSystemPrompt);

          let res = parseSolveResponse(resText);

          // One format-repair pass instead of burning backoff on parse failures
          if (!res || res.problems.length === 0) {
            console.warn(
              `Parse failed for ${item.id}, retrying with format hint`
            );
            resText = await sendImage(
              solveSystemPrompt,
              t("two-stage.fix-format")
            );
            res = parseSolveResponse(resText);
            if (!res || res.problems.length === 0) {
              throw new NonRetryableError(t("errors.parsing-failed"));
            }
          }

          problems = res.problems ?? [];
        }

        updateSolution(item.id, {
          status: "success",
          problems,
          aiSourceId: activeSource.id
        });

        updateItemStatus(item.id, "success");
      };

      // add to orderedSolutions
      for (const item of itemsToProcess) {
        // Init solution object
        addSolution({
          fileId: item.id,
          status: "pending",
          problems: []
        });
      }

      let nextIndex = 0;
      const worker = async () => {
        while (true) {
          const i = nextIndex++;
          if (i >= n) break;
          try {
            await processOne(itemsToProcess[i]);
          } catch (err) {
            const failureProblem: ProblemSolution = {
              problem: t("errors.processing-failed.problem"),
              answer: t("errors.processing-failed.answer"),
              explanation: t("errors.processing-failed.explanation", {
                error: String(err)
              }),
              steps: []
            };

            updateSolution(itemsToProcess[i].id, {
              status: "failed",
              problems: [failureProblem],
              aiSourceId: undefined
            });
            clearStreamedOutput(itemsToProcess[i].id);

            updateItemStatus(itemsToProcess[i].id, "failed");
          }
        }
      };

      const workers = Array(Math.min(concurrency, n))
        .fill(0)
        .map(() => worker());

      await Promise.all(workers);
    } catch (e) {
      console.error(e);
      toast(t("toasts.error.title"), {
        description: t("toasts.error.description")
      });
    } finally {
      toast(t("toasts.done.title"), {
        description: t("toasts.done.description")
      });
      setWorking(false);
    }
  };

  if (!isStoreReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground animate-pulse">
          {/* Loading */}
          {t("loading")}
        </p>
      </div>
    );
  }

  return (
    <>
      {imageEnhancement && <OpenCVLoader />}

      <div className={cn("min-h-screen", isMobile && "pb-24")}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <header
            className={cn(
              "mb-6 flex items-center justify-between gap-4",
              isMobile && "flex-col items-start"
            )}
          >
            <div className="flex w-full flex-col gap-2">
              <h1
                className={cn(
                  "text-3xl font-semibold tracking-tight",
                  isMobile && "text-2xl leading-tight"
                )}
              >
                {t("title")}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <Info className="h-4 w-4 shrink-0" />
                <span>{t("tip")}</span>
              </div>
            </div>

            <Button
              className={cn(
                "gap-2 whitespace-nowrap",
                isMobile ? "w-full justify-center rounded-full py-3" : "px-4"
              )}
              size={isMobile ? "lg" : "default"}
              variant="secondary"
              asChild
            >
              <a
                href="https://github.com/cubewhy/skid-homework/discussions"
                target="_blank"
                rel="noreferrer"
              >
                <StarIcon className="h-4 w-4" />
                {t("discussions-btn")}
              </a>
            </Button>
          </header>

          {isMobile && (
            <div className="mb-6 w-full rounded-2xl border border-white/15 bg-background/70 p-4 shadow-sm backdrop-blur">
              <p className="text-base font-medium">
                {items.length
                  ? t("mobile.status", { count: items.length })
                  : t("mobile.empty")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {allowPdfUploads
                  ? t("mobile.hint-ready")
                  : t("mobile.hint-pdf")}
              </p>
            </div>
          )}

          {isMobile ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "capture" | "preview")
              }
              className="md:hidden"
            >
              <TabsList className="grid w-full grid-cols-2 bg-muted/40">
                <TabsTrigger
                  value="capture"
                  className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  {t("mobile.tabs.capture")}
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  {t("mobile.tabs.preview")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="capture" className="mt-4">
                <ActionsCard
                  appendFilesAction={appendFiles}
                  clearAllAction={clearAll}
                  startScanAction={startScan}
                  totalBytes={totalBytes}
                  items={items}
                  allowPdfUploads={allowPdfUploads}
                  layout="mobile"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <PreviewCard
                  appendFiles={appendFiles}
                  removeItem={removeItem}
                  items={items}
                  layout="mobile"
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
              <ActionsCard
                appendFilesAction={appendFiles}
                clearAllAction={clearAll}
                startScanAction={startScan}
                totalBytes={totalBytes}
                items={items}
                allowPdfUploads={allowPdfUploads}
              />

              <PreviewCard
                appendFiles={appendFiles}
                removeItem={removeItem}
                items={items}
              />
            </div>
          )}

          {/* Solutions Section */}
          <section className={cn("mt-8", !isMobile && "mt-10")}>
            <SolutionsArea />
          </section>

          <footer
            className={cn(
              "mt-10 flex items-center justify-between text-sm text-muted-foreground",
              isMobile && "mt-12 flex-col items-start gap-3 text-base"
            )}
          >
            <p>
              {t("footer.license")} {t("footer.slogan")}{" "}
              <a
                className="underline"
                href="https://github.com/cubewhy/skid-homework"
                target="_blank"
                rel="noreferrer"
              >
                {/* {t("footer.source")} */}
                https://github.com/cubewhy/skid-homework
              </a>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
