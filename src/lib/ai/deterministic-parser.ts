import type { IFoodParser } from "./interfaces";
import type { FoodParseResult, ParsedFoodEntry } from "./types";
import type { FoodState, MealType } from "../supabase/types";

/**
 * Mapping of spoken numbers in English, Tamil, and Tanglish.
 */
const NUMBER_WORDS: Record<string, number> = {
  // English
  half: 0.5,
  "a half": 0.5,
  quarter: 0.25,
  one: 1,
  a: 1,
  an: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  // Tamil / Tanglish
  ara: 0.5,
  arai: 0.5,
  kaal: 0.25,
  mukkaal: 0.75,
  oru: 1,
  onnu: 1,
  rendu: 2,
  irandu: 2,
  moonu: 3,
  moondru: 3,
  naalu: 4,
  naangu: 4,
  anju: 5,
  aindhu: 5,
  aaru: 6,
  yezhu: 7,
  elu: 7,
  ettu: 8,
  ombodhu: 9,
  pathu: 10,
  ondrarai: 1.5,
  rendarai: 2.5,
};

/**
 * Recognized unit words in spoken English and Tanglish.
 */
const UNIT_WORDS: Record<string, string> = {
  // Grams
  g: "g",
  gm: "g",
  gms: "g",
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  kg: "kg",
  kgs: "kg",
  // Household portions
  katori: "katori",
  katoris: "katori",
  bowl: "katori",
  bowls: "katori",
  kinnam: "katori",
  cup: "cup",
  cups: "cup",
  spoon: "tbsp",
  spoons: "tbsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  plate: "plate",
  plates: "plate",
  thattu: "plate",
  ladle: "ladle",
  ladles: "ladle",
  karandi: "ladle",
  tumbler: "tumbler",
  tumblers: "tumbler",
  glass: "tumbler",
  glasses: "tumbler",
  piece: "piece",
  pieces: "piece",
  nos: "piece",
  item: "piece",
  items: "piece",
};

/**
 * Common foods that have natural default units (e.g. 2 idli = 2 pieces).
 */
const DEFAULT_PIECE_FOODS = new Set([
  "idli",
  "idlis",
  "dosa",
  "dosai",
  "egg",
  "eggs",
  "muttai",
  "vada",
  "vadai",
  "chapati",
  "chapatis",
  "roti",
  "rotis",
  "banana",
  "poori",
  "poorish",
]);

/**
 * Spoken meal slot markers.
 */
const MEAL_HINTS: Record<string, MealType> = {
  breakfast: "breakfast",
  kaalai: "breakfast",
  tiffin: "breakfast",
  lunch: "lunch",
  madhyanam: "lunch",
  dinner: "dinner",
  night: "dinner",
  iravu: "dinner",
  snack: "snack",
  snacks: "snack",
  evening: "snack",
};

/**
 * Deterministic, offline-capable Food Parser implementing IFoodParser.
 * Accurately parses English, Tamil, and Tanglish spoken statements.
 */
export class DeterministicFoodParser implements IFoodParser {
  public readonly parserName = "DeterministicFoodParser (Tanglish & English)";

  /**
   * Parses natural language speech or text into structured food candidates.
   */
  public async parseFoodText(rawText: string): Promise<FoodParseResult> {
    const cleanedText = rawText.trim();
    if (!cleanedText) {
      return { entries: [], unparsedSegments: [] };
    }

    // 1. Detect and strip overall meal hints (e.g. "for lunch", "lunch ku", "breakfast ku")
    let workingText = cleanedText;
    let detectedMealHint: MealType | undefined;

    for (const [hintWord, mealType] of Object.entries(MEAL_HINTS)) {
      const hintRegex = new RegExp(`\\b(?:for|ku|in)?\\s*${hintWord}(?:\\s*(?:ku|for))?\\b`, "gi");
      if (hintRegex.test(workingText)) {
        detectedMealHint = mealType;
        workingText = workingText.replace(hintRegex, " ");
      }
    }

    // 2. Split clauses by coordinating conjunctions ("and", "plus", "with", ",", "appuram")
    const clauses = workingText
      .split(/(?:,|\band\b|\bplus\b|\bwith\b|\bappuram\b|\bkooda\b|\bpinbu\b)/i)
      .map((c) => c.trim())
      .filter(Boolean);

    const entries: ParsedFoodEntry[] = [];
    const unparsedSegments: string[] = [];

    for (const clause of clauses) {
      const parsed = this.parseClause(clause);
      if (parsed) {
        if (detectedMealHint) {
          parsed.ambiguities = parsed.ambiguities || [];
        }
        entries.push(parsed);
      } else {
        unparsedSegments.push(clause);
      }
    }

    return { entries, unparsedSegments };
  }

  private parseClause(clause: string): ParsedFoodEntry | null {
    const tokens = clause.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;

    let quantity: number | null = null;
    let unit: string | null = null;
    let foodTokens: string[] = [];
    let state: FoodState = "cooked";
    const ambiguities: string[] = [];

    let idx = 0;

    // A. Parse Quantity (numeric e.g. "200", "1.5", or word e.g. "two", "rendu", "half", "ara")
    if (idx < tokens.length) {
      const tok = tokens[idx].toLowerCase();

      // Check fractional or decimal numbers
      const numericMatch = tok.match(/^(\d+(?:\.\d+)?)$/);
      if (numericMatch) {
        quantity = parseFloat(numericMatch[1]);
        idx++;
      } else if (tok in NUMBER_WORDS) {
        quantity = NUMBER_WORDS[tok];
        idx++;
        // Check for compound numbers like "1 and a half" or "ondrarai"
        if (idx < tokens.length && tokens[idx].toLowerCase() in NUMBER_WORDS) {
          // handled if needed
        }
      }
    }

    // B. Parse Unit (e.g. "gram", "grams", "cup", "katori", "spoon")
    if (idx < tokens.length) {
      const tok = tokens[idx].toLowerCase();
      if (tok in UNIT_WORDS) {
        unit = UNIT_WORDS[tok];
        idx++;
      }
    }

    // C. Remaining tokens form the food name
    while (idx < tokens.length) {
      const tok = tokens[idx];
      const lower = tok.toLowerCase();

      // Check cooking state clues
      if (["cooked", "avicha", "boiled", "satham", "soru"].includes(lower)) {
        state = "cooked";
      } else if (["raw", "pacha", "pacharisi", "uncooked"].includes(lower)) {
        state = "raw";
      }

      foodTokens.push(tok);
      idx++;
    }

    let foodName = foodTokens.join(" ").trim();

    // D. If quantity was not at the start, check if it's placed after the food name (e.g. "cooked rice 200g")
    if (quantity === null) {
      const embeddedMatch = clause.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
      if (embeddedMatch) {
        foodName = embeddedMatch[1].trim();
        quantity = parseFloat(embeddedMatch[2]);
        const matchedUnit = embeddedMatch[3] ? embeddedMatch[3].toLowerCase() : "";
        unit = UNIT_WORDS[matchedUnit] || (matchedUnit ? matchedUnit : null);
      }
    }

    if (!foodName) {
      return null;
    }

    // E. Default unit resolution for countable items (e.g. "2 idli" -> 2 piece)
    const lowerFood = foodName.toLowerCase();
    if (quantity !== null && !unit) {
      if (DEFAULT_PIECE_FOODS.has(lowerFood) || lowerFood.includes("idli") || lowerFood.includes("dosa") || lowerFood.includes("egg")) {
        unit = "piece";
      } else {
        unit = "g";
        ambiguities.push(`Unit not specified for "${foodName}". Defaulted to grams.`);
      }
    }

    // If quantity is missing, default to 1 portion and mark ambiguous
    if (quantity === null) {
      quantity = 1;
      unit = unit || "serving";
      ambiguities.push(`Quantity not specified for "${foodName}". Defaulted to 1 serving.`);
    }

    return {
      foodName,
      quantity,
      unit: unit || "g",
      ambiguities: ambiguities.length > 0 ? ambiguities : undefined,
      isAmbiguous: ambiguities.length > 0,
    };
  }
}
