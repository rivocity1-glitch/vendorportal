import { ParsedProduct, ProductMatch } from './types';
import { MATCH_THRESHOLDS } from './constants';

export interface ExistingProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  aliases?: string[];
}

/**
 * Normalizes textual attributes into uniform lowercase strings for comparison,
 * stripping extraneous special symbols, characters, and spaces.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Leverages the Levenshtein distance equation to compute a normalized string
 * similarity metrics coefficient scaled smoothly between 0.0 and 1.0.
 */
function similarityScore(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  
  const track = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) track[0][i] = i;
  for (let j = 0; j <= len2; j++) track[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[len2][len1];
  const maxLen = Math.max(len1, len2);
  return (maxLen - distance) / maxLen;
}

/**
 * Main logical function contrasting a parsed candidate row against local catalogs.
 * Execution boundaries are secured via structured try/catch blocks to eliminate runtime panic risk.
 * * @param product The structured product line parsed from the invoice.
 * @param existingProducts Complete list of current vendor inventory master items.
 * @returns An evaluated deterministic ProductMatch validation payload.
 */
export function matchProduct(
  product: ParsedProduct,
  existingProducts: ExistingProduct[]
): ProductMatch {
  const fallbackMatch: ProductMatch = {
    productId: '',
    confidence: 0,
    matchType: 'None',
  };

  if (!product || !product.name || !existingProducts || existingProducts.length === 0) {
    return fallbackMatch;
  }

  try {
    const targetName = normalizeName(product.name);
    let bestMatch: ExistingProduct | null = null;
    let highestScore = 0;

    for (const currentProduct of existingProducts) {
      const primaryName = normalizeName(currentProduct.name);
      let localBestScore = similarityScore(targetName, primaryName);

      // Evaluate defined catalog alternate name string indices if populated
      if (currentProduct.aliases && currentProduct.aliases.length > 0) {
        for (const alias of currentProduct.aliases) {
          const normalizedAlias = normalizeName(alias);
          const aliasScore = similarityScore(targetName, normalizedAlias);
          if (aliasScore > localBestScore) {
            localBestScore = aliasScore;
          }
        }
      }

      if (localBestScore > highestScore) {
        highestScore = localBestScore;
        bestMatch = currentProduct;
      }
    }

    // Classify specific discrete outcome levels based on global system parameters
    if (highestScore >= MATCH_THRESHOLDS.EXACT && bestMatch) {
      return {
        productId: bestMatch.id,
        confidence: Math.round(highestScore * 100),
        matchType: 'Exact',
      };
    } else if (highestScore >= MATCH_THRESHOLDS.PROBABLE && bestMatch) {
      return {
        productId: bestMatch.id,
        confidence: Math.round(highestScore * 100),
        matchType: 'Fuzzy',
      };
    } else if (highestScore >= MATCH_THRESHOLDS.REVIEW && bestMatch) {
      return {
        productId: bestMatch.id,
        confidence: Math.round(highestScore * 100),
        matchType: 'Fuzzy',
      };
    }

    return fallbackMatch;
  } catch {
    return fallbackMatch;
  }
}