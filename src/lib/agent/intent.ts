export interface BuyerIntent {
  budgetInr?: number;
  size?: string;
  usage?: string[];
  preference?: string[];
  category?: string;
  raw: string;
}

const USAGE_KEYWORDS = ["daily running", "trail running", "gym", "training", "recovery", "casual", "marathon", "running"];
const PREFERENCE_KEYWORDS = ["lightweight", "cushioned", "breathable", "durable", "waterproof", "premium", "budget"];

// Ordered most-specific-first: a multi-word phrase like "training shoes"
// must be checked before the generic "shoe" keyword, or it always loses to
// the more common Running Shoes category. Checked in array order, first
// match wins — do not reorder without keeping specific phrases ahead of
// their generic substrings.
const CATEGORY_KEYWORDS: [string, string][] = [
  ["training shoe", "Training Shoes"],
  ["training shoes", "Training Shoes"],
  ["cross training", "Training Shoes"],
  ["gym shoe", "Training Shoes"],
  ["gym shoes", "Training Shoes"],
  ["running shoe", "Running Shoes"],
  ["running shoes", "Running Shoes"],
  ["shoe", "Running Shoes"],
  ["shoes", "Running Shoes"],
  ["sneaker", "Running Shoes"],
  ["sock", "Sports Socks"],
  ["socks", "Sports Socks"],
  ["short", "Running Shorts"],
  ["shorts", "Running Shorts"],
  ["bag", "Gym Bags"],
  ["bottle", "Water Bottles"],
  ["watch", "Fitness Watches"],
  ["tshirt", "Sports T-Shirts"],
  ["t-shirt", "Sports T-Shirts"],
  ["insole", "Insoles"],
  ["recovery", "Recovery"],
];

/**
 * Deterministic, rule-based natural-language intent parser for the AI Buyer
 * Simulator. Kept rule-based (rather than a live LLM call) by design: the
 * hackathon demo must be repeatable and the parsed fields are then used to
 * drive real policy-relevant filtering, so we want fully inspectable logic
 * rather than free-form generation. See README "AI Agent" for rationale.
 */
export function parseIntent(query: string): BuyerIntent {
  const q = query.toLowerCase();
  const intent: BuyerIntent = { raw: query };

  const priceMatch = q.match(/(?:under|below|less than|within)\s*(?:rs\.?|inr|₹)?\s*([\d,]+)/i) ||
    q.match(/₹\s*([\d,]+)/);
  if (priceMatch) intent.budgetInr = parseInt(priceMatch[1].replace(/,/g, ""), 10);

  const sizeMatch = q.match(/size\s*(\d+)/i);
  if (sizeMatch) intent.size = sizeMatch[1];

  intent.usage = USAGE_KEYWORDS.filter((k) => q.includes(k));
  intent.preference = PREFERENCE_KEYWORDS.filter((k) => q.includes(k));

  for (const [kw, category] of CATEGORY_KEYWORDS) {
    if (q.includes(kw)) {
      intent.category = category;
      break;
    }
  }

  return intent;
}
