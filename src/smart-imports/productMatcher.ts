import { ParsedProduct, ProductMatch } from './types';
import { MATCH_THRESHOLDS } from './constants';

export interface ExistingProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode?: string | null;
  sku?: string | null;
  weight?: string | null;
  gstPercent?: number | null;
  aliases?: string[];
}

/**
 * Normalizes strings by lowercasing, removing special characters, and converting common
 * duplicate consonants/vowels into single representations to handle typos like:
 * Aashirvad / Aashirvaad / Aashwad.
 */
function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/aa/g, 'a')
    .replace(/sh/g, 's')
    .replace(/v/g, 'w')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Levenshtein distance similarity (0.0 to 1.0).
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const track = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) track[0][i] = i;
  for (let j = 1; j <= len2; j++) track[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = track[len2][len1];
  const maxLen = Math.max(len1, len2);
  return (maxLen - distance) / maxLen;
}

/**
 * Jaro-Winkler string similarity to give higher weight to matching prefixes,
 * handling OCR/spelling variations effectively.
 */
function jaroWinklerSimilarity(s1: string, s2: string): number {
  let m = 0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  if (s1 === s2) return 1.0;

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      m++;
      break;
    }
  }

  if (m === 0) return 0.0;

  let k = 0;
  let numTranspositions = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) numTranspositions++;
    k++;
  }

  const jaro = (m / s1.length + m / s2.length + (m - numTranspositions / 2) / m) / 3;
  let prefixLength = 0;
  const maxPrefix = 4;

  for (let i = 0; i < Math.min(maxPrefix, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefixLength++;
    else break;
  }

  return jaro + prefixLength * 0.1 * (1 - jaro);
}

/**
 * Hybrid similarity calculation for high typo tolerance.
 */
function calculateTypoTolerantScore(target: string, candidate: string): number {
  const normTarget = normalizeName(target);
  const normCandidate = normalizeName(candidate);

  if (normTarget === normCandidate) return 1.0;

  const levScore = levenshteinSimilarity(normTarget, normCandidate);
  const jwScore = jaroWinklerSimilarity(normTarget, normCandidate);

  return Math.max(levScore, jwScore);
}

/**
 * Main product matching algorithm enforcing prioritized matching steps:
 * 1. Barcode
 * 2. SKU
 * 3. Exact Name
 * 4. Alias
 * 5. Fuzzy Name (Typo tolerant)
 * 6. Weight
 * 7. GST
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

  if (!product || !existingProducts || existingProducts.length === 0) {
    return fallbackMatch;
  }

  try {
    // 1. Barcode Matching
    if (product.barcode) {
      const cleanBarcode = product.barcode.trim();
      const match = existingProducts.find(
        p => p.barcode && p.barcode.trim() === cleanBarcode
      );
      if (match) {
        return {
          productId: match.id,
          confidence: 100,
          matchType: 'Exact',
        };
      }
    }

    // 2. SKU Matching
    if (product.sku) {
      const cleanSku = product.sku.trim().toLowerCase();
      const match = existingProducts.find(
        p => p.sku && p.sku.trim().toLowerCase() === cleanSku
      );
      if (match) {
        return {
          productId: match.id,
          confidence: 98,
          matchType: 'Exact',
        };
      }
    }

    const rawProductName = product.name ? product.name.trim() : '';
    const targetName = normalizeName(rawProductName);

    if (!targetName) return fallbackMatch;

    // 3. Exact Name Matching
    const exactNameMatch = existingProducts.find(
      p => normalizeName(p.name) === targetName
    );
    if (exactNameMatch) {
      return {
        productId: exactNameMatch.id,
        confidence: 95,
        matchType: 'Exact',
      };
    }

    // 4. Alias Matching
    for (const p of existingProducts) {
      if (p.aliases && p.aliases.length > 0) {
        const aliasHit = p.aliases.some(
          alias => normalizeName(alias) === targetName
        );
        if (aliasHit) {
          return {
            productId: p.id,
            confidence: 90,
            matchType: 'Exact',
          };
        }
      }
    }

    // 5. Fuzzy Name Matching (Typo tolerant)
    let bestFuzzyMatch: ExistingProduct | null = null;
    let highestFuzzyScore = 0;

    for (const p of existingProducts) {
      let score = calculateTypoTolerantScore(rawProductName, p.name);

      // Check aliases if name score is below threshold
      if (p.aliases && p.aliases.length > 0) {
        for (const alias of p.aliases) {
          const aliasScore = calculateTypoTolerantScore(rawProductName, alias);
          if (aliasScore > score) {
            score = aliasScore;
          }
        }
      }

      if (score > highestFuzzyScore) {
        highestFuzzyScore = score;
        bestFuzzyMatch = p;
      }
    }

    if (highestFuzzyScore >= MATCH_THRESHOLDS.PROBABLE && bestFuzzyMatch) {
      return {
        productId: bestFuzzyMatch.id,
        confidence: Math.round(highestFuzzyScore * 100),
        matchType: 'Fuzzy',
      };
    }

    // 6. Weight Matching
    if (product.weight) {
      const cleanWeight = product.weight.toLowerCase().replace(/\s+/g, '');
      const weightMatch = existingProducts.find(
        p => p.weight && p.weight.toLowerCase().replace(/\s+/g, '') === cleanWeight
      );
      if (weightMatch) {
        return {
          productId: weightMatch.id,
          confidence: 70,
          matchType: 'Fuzzy',
        };
      }
    }

    // 7. GST Percentage Matching
    const productGst = product.gstPercent ?? product.gstRate;
    if (productGst !== null && productGst !== undefined) {
      const gstMatch = existingProducts.find(
        p => p.gstPercent === productGst
      );
      if (gstMatch && highestFuzzyScore >= MATCH_THRESHOLDS.REVIEW) {
        return {
          productId: gstMatch.id,
          confidence: 60,
          matchType: 'Fuzzy',
        };
      }
    }

    // Return best fallback fuzzy match if above review threshold
    if (highestFuzzyScore >= MATCH_THRESHOLDS.REVIEW && bestFuzzyMatch) {
      return {
        productId: bestFuzzyMatch.id,
        confidence: Math.round(highestFuzzyScore * 100),
        matchType: 'Fuzzy',
      };
    }

    return fallbackMatch;
  } catch {
    return fallbackMatch;
  }
}