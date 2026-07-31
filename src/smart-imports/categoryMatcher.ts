import { ParsedProduct, CategoryMatch } from './types';

/**
 * Reusable static internal category keyword mapping configuration.
 * Strictly aligned with valid target database category names.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Bakery': [
    'cake', 'bread', 'pastry', 'biscuit', 'bun', 'cookie', 'croissant', 'toast', 'rusk', 
    'muffin', 'pie', 'donut', 'pancake', 'tart', 'doughnut', 'baking', 'yeast', 'pav'
  ],
  'Dairy': [
    'milk', 'cheese', 'butter', 'curd', 'paneer', 'yogurt', 'cream', 'ghee', 'dahi', 
    'lassi', 'buttermilk', 'makhhan', 'amul', 'condensed milk', 'whey', 'khoya', 'mawa'
  ],
  'Electronics': [
    'laptop', 'cable', 'charger', 'usb', 'display', 'monitor', 'led', 'battery', 'adapter', 'tv', 
    'hdmi', 'wire', 'circuit', 'resistor', 'cpu', 'ram', 'ssd', 'hdd', 'mouse', 'keyboard', 'plug', 'socket'
  ],
  'Fashion': [
    'shirt', 'tshirt', 'jeans', 'pants', 'socks', 'jacket', 'shoes', 'cotton', 'wear', 'clothing', 
    'trousers', 'saree', 'kurti', 'dress', 'suit', 'innerwear', 'belt', 'scarf', 'denim', 'footwear'
  ],
  'Flowers': [
    'rose', 'bouquet', 'flower', 'petal', 'marigold', 'lily', 'jasmine', 'orchid', 'sunflower', 
    'tulip', 'garland', 'gajra', 'floral'
  ],
  'Fruits & Vegetables': [
    'apple', 'banana', 'tomato', 'potato', 'onion', 'garlic', 'ginger', 'fruit', 'vegetable', 'veg', 
    'mango', 'orange', 'lemon', 'chilli', 'chili', 'capsicum', 'spinach', 'coriander', 'mint', 'cabbage', 
    'cauliflower', 'carrot', 'cucumber'
  ],
  'Grocery': [
    'sugar', 'rice', 'oil', 'flour', 'salt', 'snack', 'water', 'beverage', 'tea', 'coffee', 'groceries', 
    'food', 'general', 'spice', 'spices', 'pulses', 'dal', 'wheat', 'grain', 'soap', 'shampoo', 
    'atta', 'maida', 'sooji', 'suji', 'besan', 'poha', 'masala', 'turmeric', 'mustard', 'cumin', 'hing', 
    'pasta', 'noodles', 'sauce', 'ketchup', 'pickle', 'jam', 'chips', 'namkeen'
  ],
  'Hardware': [
    'tool', 'screw', 'bolt', 'hammer', 'nail', 'drill', 'wrench', 'wire', 'pipe', 'nut', 
    'plier', 'pvc', 'cement', 'paint', 'lock', 'hinge', 'bracket', 'adhesive', 'tape'
  ],
  'Home & Kitchen': [
    'pan', 'pot', 'plate', 'spoon', 'knife', 'cooker', 'blender', 'towel', 'bedsheet', 'curtain', 
    'fork', 'glass', 'container', 'mop', 'broom', 'bucket', 'container', 'bottle', 'kettle', 'juicer'
  ],
  'Medical': [
    'tablet', 'capsule', 'syrup', 'injection', 'ointment', 'mg', 'ml', 'paracetamol', 'pharma', 
    'vaccine', 'medicine', 'pharmaceuticals', 'sirup', 'lotion', 'cream', 'bandage', 'drop', 
    'gel', 'suspension', 'tab', 'cap', 'inj', 'sachet', 'antiseptic', 'dettol', 'savlon', 'dextrose'
  ],
  'Mobile Shop': [
    'phone', 'mobile', 'smartphone', 'sim', 'tempered', 'case', 'cover', 'earphone', 'headphone', 
    'airpods', 'backcover', 'screen guard', 'powerbank', 'type-c'
  ],
  'Pet Supplies': [
    'dog', 'cat', 'pet', 'food', 'kibble', 'leash', 'aquarium', 'bird', 'litter', 'collar', 
    'pedigree', 'whiskas', 'treats'
  ],
  'Stationery': [
    'paper', 'pen', 'marker', 'notebook', 'folder', 'stapler', 'ink', 'desk', 'tape', 'pencil', 'eraser', 
    'register', 'diary', 'calculator', 'envelope', 'glue', 'scissors', 'binder', 'ruler'
  ],
  'Sweets': [
    'ladoo', 'barfi', 'sweet', 'sweets', 'halwa', 'pedha', 'gulab', 'jamun', 'chocolates', 'candy', 
    'rasgulla', 'kaju katli', 'son papdi', 'soan papdi', 'toffee', 'fudge'
  ],
};

/**
 * Normalizes input string by forcing lowercase and stripping trailing symbols/punctuation.
 */
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/aa/g, 'a')
    .replace(/sh/g, 's')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein similarity distance for typo tolerance.
 */
function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1) return s2.length;
  if (!s2) return s1.length;

  const len1 = s1.length;
  const len2 = s2.length;
  const track = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) track[0][i] = i;
  for (let j = 0; j <= len2; j++) track[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[len2][len1];
}

/**
 * Token matching heuristic with typo tolerance computing score from 0 to 100.
 */
function calculateScore(normalizedName: string, keywords: string[]): number {
  if (!normalizedName) return 0;
  
  let matches = 0;
  const nameTokens = normalizedName.split(' ');

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();

    // Direct substring hit
    if (normalizedName.includes(normalizedKeyword)) {
      matches += 2;
    }

    // Exact or typo-tolerant token evaluation
    for (const token of nameTokens) {
      if (token === normalizedKeyword) {
        matches += 3;
      } else if (token.length >= 4 && normalizedKeyword.length >= 4) {
        const dist = levenshteinDistance(token, normalizedKeyword);
        if (dist <= 1) { // 1 character typo allowed
          matches += 2;
        }
      }
    }
  }

  if (matches === 0) return 0;

  // Scale score smoothly up to 100
  return Math.min(Math.round((matches / (Math.sqrt(nameTokens.length) + 1)) * 30), 100);
}

/**
 * Main module orchestration logic analyzing product info against database-aligned classification mappings.
 * Functional resilience is protected; it safely drops back to a valid fallback definition instead of throwing.
 *
 * @param product The structured parsed candidate row product.
 * @returns An assigned category match payload containing name assignment and structural confidence score.
 */
export function matchCategory(product: ParsedProduct): CategoryMatch {
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

    const MINIMUM_CONFIDENCE_THRESHOLD = 15;
    if (maxScore < MINIMUM_CONFIDENCE_THRESHOLD) {
      return fallbackMatch;
    }

    return {
      categoryName: bestCategory,
      confidence: maxScore,
    };
  } catch {
    return fallbackMatch;
  }
}