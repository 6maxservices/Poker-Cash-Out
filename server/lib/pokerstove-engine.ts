/**
 * PokerStove-compatible hand evaluator implementation
 * Based on the open-source PokerStove algorithms for maximum accuracy
 */

import { Card, Rank, Suit } from "@shared/schema";

// PokerStove-style rank values (2=2, 3=3, ..., T=10, J=11, Q=12, K=13, A=14)
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Hand strength rankings (higher is better)
export enum HandStrength {
  HIGH_CARD = 0,
  PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8
}

export interface HandResult {
  strength: HandStrength;
  primary: number;    // Primary rank (pair rank, straight high card, etc.)
  secondary: number;  // Secondary rank (kicker, second pair, etc.)
  kickers: number[];  // Remaining kickers in descending order
}

/**
 * Fast hand evaluator using PokerStove-style algorithms
 * Evaluates 5-card poker hands with optimal performance
 */
export class PokerStoveEvaluator {
  
  /**
   * Evaluate a 5-card poker hand
   * @param cards Array of exactly 5 cards
   * @returns HandResult with strength and ranking information
   */
  static evaluateHand(cards: Card[]): HandResult {
    if (cards.length !== 5) {
      throw new Error("PokerStove evaluator requires exactly 5 cards");
    }

    const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    
    const isFlush = this.checkFlush(suits);
    const straightRank = this.checkStraight(ranks);
    const rankCounts = this.getRankCounts(ranks);
    
    // Straight flush
    if (isFlush && straightRank > 0) {
      return {
        strength: HandStrength.STRAIGHT_FLUSH,
        primary: straightRank,
        secondary: 0,
        kickers: []
      };
    }
    
    // Four of a kind
    if (rankCounts.quads > 0) {
      return {
        strength: HandStrength.FOUR_OF_A_KIND,
        primary: rankCounts.quads,
        secondary: 0,
        kickers: [rankCounts.kicker]
      };
    }
    
    // Full house
    if (rankCounts.trips > 0 && rankCounts.pairs.length > 0) {
      return {
        strength: HandStrength.FULL_HOUSE,
        primary: rankCounts.trips,
        secondary: rankCounts.pairs[0],
        kickers: []
      };
    }
    
    // Flush
    if (isFlush) {
      return {
        strength: HandStrength.FLUSH,
        primary: ranks[0],
        secondary: 0,
        kickers: ranks.slice(1)
      };
    }
    
    // Straight
    if (straightRank > 0) {
      return {
        strength: HandStrength.STRAIGHT,
        primary: straightRank,
        secondary: 0,
        kickers: []
      };
    }
    
    // Three of a kind
    if (rankCounts.trips > 0) {
      return {
        strength: HandStrength.THREE_OF_A_KIND,
        primary: rankCounts.trips,
        secondary: 0,
        kickers: rankCounts.remainingKickers
      };
    }
    
    // Two pair
    if (rankCounts.pairs.length === 2) {
      const [highPair, lowPair] = rankCounts.pairs.sort((a, b) => b - a);
      return {
        strength: HandStrength.TWO_PAIR,
        primary: highPair,
        secondary: lowPair,
        kickers: [rankCounts.kicker]
      };
    }
    
    // One pair
    if (rankCounts.pairs.length === 1) {
      return {
        strength: HandStrength.PAIR,
        primary: rankCounts.pairs[0],
        secondary: 0,
        kickers: rankCounts.remainingKickers
      };
    }
    
    // High card
    return {
      strength: HandStrength.HIGH_CARD,
      primary: ranks[0],
      secondary: 0,
      kickers: ranks.slice(1)
    };
  }
  
  /**
   * Compare two hand results (PokerStove-compatible)
   * @returns positive if hand1 > hand2, negative if hand1 < hand2, 0 if equal
   */
  static compareHands(hand1: HandResult, hand2: HandResult): number {
    // Compare hand strength first
    if (hand1.strength !== hand2.strength) {
      return hand1.strength - hand2.strength;
    }
    
    // Compare primary rank
    if (hand1.primary !== hand2.primary) {
      return hand1.primary - hand2.primary;
    }
    
    // Compare secondary rank
    if (hand1.secondary !== hand2.secondary) {
      return hand1.secondary - hand2.secondary;
    }
    
    // Compare kickers
    const maxKickers = Math.max(hand1.kickers.length, hand2.kickers.length);
    for (let i = 0; i < maxKickers; i++) {
      const kicker1 = hand1.kickers[i] || 0;
      const kicker2 = hand2.kickers[i] || 0;
      if (kicker1 !== kicker2) {
        return kicker1 - kicker2;
      }
    }
    
    return 0; // Equal hands
  }
  
  private static checkFlush(suits: Suit[]): boolean {
    return suits.every(suit => suit === suits[0]);
  }
  
  private static checkStraight(ranks: number[]): number {
    const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => b - a);
    
    if (uniqueRanks.length < 5) return 0;
    
    // Check for regular straight
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
        return uniqueRanks[i]; // Return high card of straight
      }
    }
    
    // Check for wheel straight (A-2-3-4-5)
    if (uniqueRanks.includes(14) && uniqueRanks.includes(5) && 
        uniqueRanks.includes(4) && uniqueRanks.includes(3) && uniqueRanks.includes(2)) {
      return 5; // Wheel straight high card is 5
    }
    
    return 0; // No straight
  }
  
  private static getRankCounts(ranks: number[]) {
    const counts: { [rank: number]: number } = {};
    for (const rank of ranks) {
      counts[rank] = (counts[rank] || 0) + 1;
    }
    
    const pairs: number[] = [];
    let trips = 0;
    let quads = 0;
    let kicker = 0;
    const remainingKickers: number[] = [];
    
    // Sort ranks by count, then by rank value
    const sortedRanks = Object.keys(counts)
      .map(Number)
      .sort((a, b) => {
        const countDiff = counts[b] - counts[a];
        return countDiff !== 0 ? countDiff : b - a;
      });
    
    for (const rank of sortedRanks) {
      const count = counts[rank];
      if (count === 4) {
        quads = rank;
      } else if (count === 3) {
        trips = rank;
      } else if (count === 2) {
        pairs.push(rank);
      } else {
        if (kicker === 0) kicker = rank;
        remainingKickers.push(rank);
      }
    }
    
    // Sort kickers in descending order
    remainingKickers.sort((a, b) => b - a);
    
    return { pairs, trips, quads, kicker, remainingKickers };
  }
}

/**
 * Get the best 5-card hand from 7 cards (PokerStove-compatible)
 */
export function getBestHand(cards: Card[]): HandResult {
  if (cards.length < 5) {
    throw new Error("Need at least 5 cards to evaluate");
  }
  
  if (cards.length === 5) {
    return PokerStoveEvaluator.evaluateHand(cards);
  }
  
  // Generate all 5-card combinations and find the best
  const combinations = getCombinations(cards, 5);
  let bestHand = PokerStoveEvaluator.evaluateHand(combinations[0]);
  
  for (let i = 1; i < combinations.length; i++) {
    const currentHand = PokerStoveEvaluator.evaluateHand(combinations[i]);
    if (PokerStoveEvaluator.compareHands(currentHand, bestHand) > 0) {
      bestHand = currentHand;
    }
  }
  
  return bestHand;
}

/**
 * Generate all combinations of r items from array
 */
function getCombinations<T>(array: T[], r: number): T[][] {
  const result: T[][] = [];
  
  function combine(start: number, combo: T[]) {
    if (combo.length === r) {
      result.push([...combo]);
      return;
    }
    
    for (let i = start; i < array.length; i++) {
      combo.push(array[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  
  combine(0, []);
  return result;
}