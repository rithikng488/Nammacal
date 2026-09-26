import { SEED_FOODS, type FoodSeedRecord } from "./food-dataset";
import type { Food, FoodCategory, FoodState } from "../supabase/types";

export interface FoodSearchOptions {
  query?: string;
  category?: FoodCategory | "all";
  state?: FoodState | "all";
  limit?: number;
}

export interface FoodSearchResult {
  food: Food;
  matchedOn: "name_en" | "name_ta" | "name_tanglish" | "alias" | "category" | "all";
  score: number; // 0.0 - 1.0 (higher is better)
}

/**
 * Normalizes text for case-insensitive, punctuation-agnostic search.
 */
export function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/['’"\-–—]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Simple character n-gram generator for fuzzy matching.
 */
function getTrigrams(text: string): Set<string> {
  const normalized = `  ${normalizeSearchTerm(text)} `;
  const trigrams = new Set<string>();
  for (let i = 0; i < normalized.length - 2; i++) {
    trigrams.add(normalized.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Computes Dice's coefficient between two strings based on trigram overlap.
 */
export function computeSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const normA = normalizeSearchTerm(a);
  const normB = normalizeSearchTerm(b);

  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  const triA = getTrigrams(normA);
  const triB = getTrigrams(normB);

  let matches = 0;
  for (const tri of triA) {
    if (triB.has(tri)) matches++;
  }

  const total = triA.size + triB.size;
  return total === 0 ? 0 : (2 * matches) / total;
}

/**
 * High-performance search function querying verified foods and custom user records.
 * Supports:
 * - English name
 * - Tamil script (Unicode)
 * - Tanglish / transliterations
 * - Aliases
 * - Category and Raw/Cooked filtering
 * - Typo tolerance & ranking
 */
export function searchFoods(
  options: FoodSearchOptions,
  customFoods: Food[] = []
): FoodSearchResult[] {
  const { query = "", category = "all", state = "all", limit = 20 } = options;
  const normalizedQuery = normalizeSearchTerm(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  // Combine seed database with any user-created custom foods
  const allFoods: (FoodSeedRecord | (Food & { aliases?: string[] }))[] = [
    ...SEED_FOODS,
    ...customFoods,
  ];

  const results: FoodSearchResult[] = [];

  for (const item of allFoods) {
    // 1. Filter by category if specified
    if (category !== "all" && item.category !== category) {
      continue;
    }

    // 2. Filter by cooking state if specified
    if (state !== "all" && item.state !== state) {
      continue;
    }

    // 3. If query is empty, return all matching category/state
    if (!normalizedQuery) {
      results.push({
        food: item,
        matchedOn: "all",
        score: 1.0,
      });
      continue;
    }

    let bestScore = 0;
    let matchedOn: FoodSearchResult["matchedOn"] = "name_en";

    // A. Check English name
    const enSimilarity = computeSimilarity(item.name_en, normalizedQuery);
    if (enSimilarity > bestScore) {
      bestScore = enSimilarity;
      matchedOn = "name_en";
    }

    // B. Check Tamil script name (exact or substring)
    if (item.name_ta) {
      if (item.name_ta.includes(query.trim())) {
        bestScore = Math.max(bestScore, 0.95);
        matchedOn = "name_ta";
      } else {
        const taSim = computeSimilarity(item.name_ta, query);
        if (taSim > bestScore) {
          bestScore = taSim;
          matchedOn = "name_ta";
        }
      }
    }

    // C. Check Tanglish transliteration
    if (item.name_tanglish) {
      const tangSim = computeSimilarity(item.name_tanglish, normalizedQuery);
      if (tangSim > bestScore) {
        bestScore = tangSim;
        matchedOn = "name_tanglish";
      }
    }

    // D. Check Aliases (vital for Tamil terminology like 'soru', 'satham', 'arisi', 'thayir')
    const aliases = item.aliases || [];
    for (const alias of aliases) {
      const aliasSim = computeSimilarity(alias, normalizedQuery);
      if (aliasSim > bestScore) {
        bestScore = aliasSim;
        matchedOn = "alias";
      }
    }

    // E. Check token matching (all words in query match somewhere)
    const combinedSearchSpace = normalizeSearchTerm(
      `${item.name_en} ${item.name_tanglish || ""} ${aliases.join(" ")}`
    );
    const allTokensMatch = queryTokens.length > 1 && queryTokens.every((token) => combinedSearchSpace.includes(token));
    if (allTokensMatch && bestScore < 0.9) {
      bestScore = 0.9;
    }

    // Include if score meets minimum threshold (0.28 for typo tolerance)
    if (bestScore >= 0.28) {
      results.push({
        food: item,
        matchedOn,
        score: bestScore,
      });
    }
  }

  // Sort by score descending (most relevant first)
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Retrieves a food item by its unique ID from the seed database or custom items.
 */
export function getFoodById(id: string, customFoods: Food[] = []): Food | null {
  const all = [...SEED_FOODS, ...customFoods];
  return all.find((f) => f.id === id) || null;
}
