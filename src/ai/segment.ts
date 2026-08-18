/**
 * Parses the output of the fast OCR / segmentation stage.
 *
 * The prompt asks for a plain JSON array of question texts. Models
 * occasionally wrap it in a code fence or add prose, so we try the strict
 * path first, then progressively looser extractions. Returns null when the
 * output cannot be understood — the caller then falls back to the
 * single-pass full-page solve.
 */
export function parseSegmentResponse(response: string): string[] | null {
  let text = response.trim();

  // Strip optional code fences: ```json ... ```
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  const parseArray = (raw: string): string[] | null => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      const items = parsed
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim());
      return items.length > 0 ? items : null;
    } catch {
      return null;
    }
  };

  const direct = parseArray(text);
  if (direct) return direct;

  // Loose fallback: pull the largest [...] block out of surrounding prose
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    const extracted = parseArray(arrMatch[0]);
    if (extracted) return extracted;
  }

  return null;
}
