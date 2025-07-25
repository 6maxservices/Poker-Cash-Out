import { Card, Rank, Suit } from "@shared/schema";

// Card values for comparison (Ace high)
const RANK_VALUES: Record<Rank, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
};

// Hand rankings
export enum HandRank {
  HIGH_CARD = 1,
  PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10
}

export interface HandEvaluation {
  rank: HandRank;
  value: number;
  kickers: number[];
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits: Suit[] = ['♠', '♥', '♦', '♣'];
  const ranks: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  
  return deck;
}

export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function stringToCard(cardStr: string): Card {
  return {
    rank: cardStr[0] as Rank,
    suit: cardStr[1] as Suit
  };
}

export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error("Need at least 5 cards to evaluate a hand");
  }

  // Get all possible 5-card combinations
  const combinations = getCombinations(cards, 5);
  let bestHand: HandEvaluation = { rank: HandRank.HIGH_CARD, value: 0, kickers: [] };

  for (const combo of combinations) {
    const evaluation = evaluateFiveCardHand(combo);
    if (compareHands(evaluation, bestHand) > 0) {
      bestHand = evaluation;
    }
  }

  return bestHand;
}

function evaluateFiveCardHand(cards: Card[]): HandEvaluation {
  const ranks = cards.map(c => c.rank);
  const suits = cards.map(c => c.suit);
  const rankCounts = countRanks(ranks);
  const suitCounts = countSuits(suits);
  
  const isFlush = Object.values(suitCounts).some(count => count >= 5);
  const isStraight = checkStraight(ranks);
  
  // Sort rank counts by frequency then by rank value
  const sortedRankCounts = Object.entries(rankCounts)
    .sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1]; // Sort by count desc
      return RANK_VALUES[b[0] as Rank] - RANK_VALUES[a[0] as Rank]; // Then by rank desc
    });

  const counts = sortedRankCounts.map(([, count]) => count);
  const rankValues = sortedRankCounts.map(([rank]) => RANK_VALUES[rank as Rank]);

  // Check for different hand types
  if (isStraight && isFlush) {
    const highCard = Math.max(...ranks.map(r => RANK_VALUES[r]));
    if (highCard === 14 && ranks.includes('K')) { // Royal flush
      return { rank: HandRank.ROYAL_FLUSH, value: 14, kickers: [] };
    }
    return { rank: HandRank.STRAIGHT_FLUSH, value: highCard, kickers: [] };
  }
  
  if (counts[0] === 4) {
    return { rank: HandRank.FOUR_OF_A_KIND, value: rankValues[0], kickers: [rankValues[1]] };
  }
  
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: HandRank.FULL_HOUSE, value: rankValues[0], kickers: [rankValues[1]] };
  }
  
  if (isFlush) {
    return { rank: HandRank.FLUSH, value: rankValues[0], kickers: rankValues.slice(1, 5) };
  }
  
  if (isStraight) {
    const highCard = Math.max(...ranks.map(r => RANK_VALUES[r]));
    return { rank: HandRank.STRAIGHT, value: highCard, kickers: [] };
  }
  
  if (counts[0] === 3) {
    return { rank: HandRank.THREE_OF_A_KIND, value: rankValues[0], kickers: rankValues.slice(1, 3) };
  }
  
  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: HandRank.TWO_PAIR, value: rankValues[0], kickers: [rankValues[1], rankValues[2]] };
  }
  
  if (counts[0] === 2) {
    return { rank: HandRank.PAIR, value: rankValues[0], kickers: rankValues.slice(1, 4) };
  }
  
  return { rank: HandRank.HIGH_CARD, value: rankValues[0], kickers: rankValues.slice(1, 5) };
}

function countRanks(ranks: Rank[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const rank of ranks) {
    counts[rank] = (counts[rank] || 0) + 1;
  }
  return counts;
}

function countSuits(suits: Suit[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const suit of suits) {
    counts[suit] = (counts[suit] || 0) + 1;
  }
  return counts;
}

function checkStraight(ranks: Rank[]): boolean {
  const values = ranks.map(r => RANK_VALUES[r]).sort((a, b) => b - a);
  const uniqueValues = Array.from(new Set(values));
  
  if (uniqueValues.length < 5) return false;
  
  // Check for regular straight
  for (let i = 0; i < uniqueValues.length - 4; i++) {
    if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
      return true;
    }
  }
  
  // Check for wheel straight (A-2-3-4-5)
  if (uniqueValues.includes(14) && uniqueValues.includes(5) && 
      uniqueValues.includes(4) && uniqueValues.includes(3) && uniqueValues.includes(2)) {
    return true;
  }
  
  return false;
}

function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }
  
  if (hand1.value !== hand2.value) {
    return hand1.value - hand2.value;
  }
  
  for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
    const kicker1 = hand1.kickers[i] || 0;
    const kicker2 = hand2.kickers[i] || 0;
    if (kicker1 !== kicker2) {
      return kicker1 - kicker2;
    }
  }
  
  return 0;
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 1) return arr.map(item => [item]);
  if (k === arr.length) return [arr];
  
  const combinations: T[][] = [];
  
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i];
    const tailCombinations = getCombinations(arr.slice(i + 1), k - 1);
    for (const tail of tailCombinations) {
      combinations.push([head, ...tail]);
    }
  }
  
  return combinations;
}
