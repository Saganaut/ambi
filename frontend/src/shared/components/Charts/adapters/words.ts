// Free-text → word-frequency adapter for the word cloud: tokenizes submissions
// (Q&A questions, TEXT answers in word-cloud mode), drops stopwords/short
// tokens, and returns frequency-ranked ChartDatum rows. Pure — safe to call in
// render with memoization at the call site.
import type { ChartDatum } from "../Chart.types";

/** Common English function words that carry no signal in a cloud. */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", "what",
  "which", "who", "whom", "whose", "this", "that", "these", "those", "there",
  "here", "how", "why", "is", "are", "was", "were", "be", "been", "being",
  "am", "do", "does", "did", "will", "would", "can", "could", "should",
  "shall", "may", "might", "must", "have", "has", "had", "i", "you", "he",
  "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your",
  "his", "its", "our", "their", "of", "in", "on", "at", "to", "for", "with",
  "about", "as", "by", "from", "up", "down", "out", "off", "over", "under",
  "not", "no", "so", "too", "very", "just", "all", "any", "some", "more",
  "most", "other", "into", "than", "own",
]);

/** Most words a cloud stays legible with; ranks below this fold away. */
export const DEFAULT_WORD_CAP = 40;

/**
 * Lowercase word tokens: unicode letters/digits, keeping inner apostrophes and
 * hyphens ("don't", "type-safe") so they count as one word.
 */
const tokenize = (text: string): string[] =>
  text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];

/**
 * Frequency-counts the words across {@code texts}, dropping stopwords and
 * single letters, ranked by count (ties alphabetical) and capped at {@code cap}.
 */
const wordFrequencies = (texts: string[], cap = DEFAULT_WORD_CAP): ChartDatum[] => {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const word of tokenize(text)) {
      if (word.length < 2 || STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, cap)
    .map(([word, count]) => ({
      id: word,
      value: count,
      text: word,
      optionType: "TEXT" as const,
    }));
};

/**
 * Fixed preview questions for the Q&A author surface. Real submissions only
 * exist during a live session, so the editor seeds its cloud from these;
 * keywords repeat so {@link wordFrequencies} yields a spread of sizes.
 */
const SAMPLE_QUESTION_TEXTS = [
  "What is on the roadmap next?",
  "How does pricing work for a small team?",
  "Will the roadmap include mobile?",
  "Can you share the launch timeline?",
  "Is there team pricing for education?",
  "How do we migrate our data?",
  "What is the hiring plan for the team?",
  "Does support cover weekends?",
  "When is the launch date?",
  "How big is the team now?",
  "Any plans for offline support?",
  "Will the data migration be automatic?",
  "What happens to the roadmap after launch?",
  "Who owns the mobile roadmap?",
];

/**
 * Fixed preview answers for a word-cloud TEXT round, same role as
 * {@link SAMPLE_QUESTION_TEXTS} — short free-text replies with repeated terms.
 */
const SAMPLE_ANSWER_TEXTS = [
  "collaboration",
  "collaboration and trust",
  "trust",
  "clear communication",
  "communication",
  "communication",
  "focus",
  "focus and momentum",
  "momentum",
  "curiosity",
  "curiosity",
  "ownership",
  "ownership and trust",
  "clarity",
  "clarity and focus",
  "resilience",
];

export { SAMPLE_ANSWER_TEXTS, SAMPLE_QUESTION_TEXTS, wordFrequencies };
