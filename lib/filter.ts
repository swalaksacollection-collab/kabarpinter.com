// Contributor-submission filter. Pure logic (no I/O) so it is easy to test.
// Rules live in the `filter_rules` table (managed at /redaksi/filter); the
// submit action loads them and calls evaluateSubmission().
//
//   reject -> the submission is refused, the contributor sees the reasons.
//   flag   -> it still enters the review queue, with the reasons shown to the
//             editor. The editor stays the final gate for everything.

export type FilterRuleType = "banned_word" | "min_words" | "max_links";
export type FilterAction = "flag" | "reject";

export type FilterRule = {
  rule_type: FilterRuleType;
  value: string;
  action: FilterAction;
  enabled: boolean;
};

export type FilterResult = {
  action: "ok" | FilterAction;
  reasons: string[];
};

export type SubmissionText = {
  title: string;
  excerpt?: string | null;
  body?: string | null;
};

const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const LINK_RE = /(?:https?:\/\/|www\.)\S+/gi;

export function countWords(text: string): number {
  return text.match(WORD_RE)?.length ?? 0;
}

export function countLinks(text: string): number {
  return text.match(LINK_RE)?.length ?? 0;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word / whole-phrase match, case-insensitive, Unicode-aware, so a rule
// for "ass" does not hit "kelas" or "massal".
function containsPhrase(haystack: string, phrase: string): boolean {
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}_])`,
    "iu"
  );
  return re.test(haystack);
}

function threshold(value: string): number | null {
  const v = value.trim();
  return /^\d+$/.test(v) ? Number(v) : null;
}

export function evaluateSubmission(rules: FilterRule[], input: SubmissionText): FilterResult {
  const title = input.title ?? "";
  const excerpt = input.excerpt ?? "";
  const body = input.body ?? "";
  const all = `${title}\n${excerpt}\n${body}`;

  const reasons: string[] = [];
  let reject = false;

  for (const rule of rules) {
    if (!rule.enabled) continue;
    let reason: string | null = null;

    if (rule.rule_type === "banned_word") {
      const phrase = rule.value.trim();
      if (phrase && containsPhrase(all, phrase)) {
        reason = `Mengandung kata terlarang: "${phrase}"`;
      }
    } else if (rule.rule_type === "min_words") {
      const min = threshold(rule.value);
      if (min !== null) {
        const words = countWords(body);
        if (words < min) reason = `Terlalu pendek (${words} kata, minimal ${min})`;
      }
    } else if (rule.rule_type === "max_links") {
      const max = threshold(rule.value);
      if (max !== null) {
        const links = countLinks(all);
        if (links > max) reason = `Terlalu banyak tautan (${links}, maksimal ${max})`;
      }
    }

    if (reason) {
      reasons.push(reason);
      if (rule.action === "reject") reject = true;
    }
  }

  return { action: reject ? "reject" : reasons.length ? "flag" : "ok", reasons };
}
