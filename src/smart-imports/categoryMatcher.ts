import { ParsedProduct, CategoryMatch } from './types';
import { DEFAULT_IMPORT_VALUES } from './constants';

/**
 * Reusable static internal category keyword mapping configuration.
 * Strictly aligned with valid target database category names.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Bakery': ['cake', 'bread', 'pastry', 'biscuit', 'bun', 'cookie', 'croissant', 'toast', 'rusk'],
  'Dairy': ['milk', 'cheese', 'butter', 'curd', 'paneer', 'yogurt', 'cream', 'ghee'],
  'Electronics': ['laptop', 'cable', 'charger', 'usb', 'display', 'monitor', 'led', 'battery', 'adapter', 'tv'],
  'Fashion': ['shirt', 'tshirt', 'jeans', 'pants', 'socks', 'jacket', 'shoes', 'cotton', 'wear', 'clothing'],
  'Flowers': ['rose', 'bouquet', 'flower', 'petal', 'marigold', 'lily'],
  'Fruits & Vegetables': ['apple', 'banana', 'tomato', 'potato', 'onion', 'garlic', 'ginger', 'fruit', 'vegetable', 'veg'],
  'Grocery': [
    'sugar', 'rice', 'oil', 'flour', 'salt', 'snack', 'water', 'beverage', 'tea', 'coffee', 'groceries', 
    'food', 'general', 'spice', 'spices', 'pulses', 'dal', 'wheat', 'grain', 'soap', 'shampoo'
  ],
  'Hardware': ['tool', 'screw', 'bolt', 'hammer', 'nail', 'drill', 'wrench', 'wire', 'pipe'],
  'Home & Kitchen': ['pan', 'pot', 'plate', 'spoon', 'knife', 'cooker', 'blender', 'towel', 'bedsheet', 'curtain'],
  'Medical': [
    'tablet', 'capsule', 'syrup', 'injection', 'ointment', 'mg', 'ml', 'paracetamol', 'pharma', 
    'vaccine', 'medicine', 'pharmaceuticals', 'sirup', 'lotion', 'cream', 'bandage'
  ],
  'Mobile Shop': ['phone', 'mobile', 'smartphone', 'sim', 'tempered', 'case', 'cover', 'earphone'],
  'Pet Supplies': ['dog', 'cat', 'pet', 'food', 'kibble', 'leash', 'aquarium', 'bird'],
  'Stationery': ['paper', 'pen', 'marker', 'notebook', 'folder', 'stapler', 'ink', 'desk', 'tape', 'pencil', 'eraser'],
  'Sweets': ['ladoo', 'barfi', 'sweet', 'sweets', 'halwa', 'pedha', 'gulab', 'jamun', 'chocolates', 'candy'],
};

/**
 * Normalizes input string by forcing lowercase and stripping trailing symbols/punctuation.
 */
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple token matching heuristic to derive a confidence representation score from 0 to 100.
 */
function calculateScore(normalizedName: string, keywords: string[]): number {
  if (!normalizedName) return 0;
  
  let matches = 0;
  const nameTokens = normalizedName.split(' ');

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    
    // Check direct substring matches or token equivalence
    if (normalizedName.includes(normalizedKeyword)) {
      matches++;
    }
    for (const token of nameTokens) {
      if (token === normalizedKeyword) {
        matches += 0.5; // Weight localized token hits
      }
    }
  }

  if (matches === 0) return 0;

  // Bound maximum programmatic confidence calculation safely at 100
  return Math.min(Math.round((matches / Math.sqrt(nameTokens.length + 1)) * 100), 100);
}

/**
 * Main module orchestration logic analyzing product info against database-aligned classification mappings.
 * Functional resilience is protected; it safely drops back to a valid fallback definition instead of throwing.
 * * @param product The structured parsed candidate row product.
 * @returns An assigned category match payload containing name assignment and structural confidence score.
 */
export function matchCategory(product: ParsedProduct): CategoryMatch {
  // Safe baseline fallback category targeting an existing database catalog entry
  const fallbackMatch: CategoryMatch = {
    categoryName: 'Grocery',
    confidence: 0,
  };

  if (!product || !product.name) {
    return fallbackMatch;
  }

  try {
    const normalizedName = normalizeText(product.name);
    let bestCategory: string = 'Grocery';
    let maxScore = 0;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const score = calculateScore(normalizedName, keywords);
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    // Enforce an explicit internal classification boundary filter line
    const MINIMUM_CONFIDENCE_THRESHOLD = 20;
    if (maxScore < MINIMUM_CONFIDENCE_THRESHOLD) {
      return fallbackMatch;
    }

    return {
      categoryName: bestCategory as any,
      confidence: maxScore,
    };
  } catch {
    return fallbackMatch;
  }
}