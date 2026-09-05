import type { Product } from "@prisma/client";
import type { BuyerIntent } from "./intent";

export interface RankedProduct {
  product: Product;
  score: number;
  reasons: string[];
}

/** Ranks catalog search results against a parsed buyer intent. Every reason
 * cites an observable field on the product row — nothing is invented. */
export function rankProducts(products: Product[], intent: BuyerIntent): RankedProduct[] {
  const ranked = products.map((product) => {
    const reasons: string[] = [];
    let score = 0;

    if (intent.category && product.category === intent.category) {
      score += 20;
    }

    if (intent.budgetInr) {
      if (product.priceInr <= intent.budgetInr) {
        score += 25;
        reasons.push(`Within budget (₹${product.priceInr.toLocaleString("en-IN")} ≤ ₹${intent.budgetInr.toLocaleString("en-IN")})`);
      } else {
        score -= 40;
      }
    }

    if (intent.size) {
      if (product.sizes.split(",").includes(intent.size)) {
        score += 20;
        reasons.push(`Size ${intent.size} available`);
      } else {
        score -= 50;
      }
    }

    const tags = product.aiTags.toLowerCase();
    for (const u of intent.usage ?? []) {
      if (tags.includes(u)) {
        score += 15;
        reasons.push(`Designed for ${u}`);
      }
    }
    for (const p of intent.preference ?? []) {
      if (tags.includes(p)) {
        score += 15;
        reasons.push(`Tagged "${p}"`);
      }
    }

    if (product.stock > 0) {
      score += 5;
    } else {
      score -= 100;
      reasons.push("Out of stock");
    }

    const deliveryDays = parseInt(product.deliveryDays, 10);
    if (!Number.isNaN(deliveryDays) && deliveryDays <= 3) {
      reasons.push(`${product.deliveryDays} delivery`);
    }

    return { product, score, reasons };
  });

  return ranked.sort((a, b) => b.score - a.score);
}
