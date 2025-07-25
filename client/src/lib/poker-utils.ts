import { Card, Rank, Suit } from "@shared/schema";

export const suits: Suit[] = ['♠', '♥', '♦', '♣'];
export const ranks: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export function createFullDeck(): Card[] {
  const deck: Card[] = [];
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

export function isRedSuit(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculatePotOdds(equity: number): string {
  if (equity <= 0) return "∞:1";
  
  const ratio = (100 - equity) / equity;
  if (ratio < 1) {
    return `1:${(1 / ratio).toFixed(1)}`;
  }
  return `${ratio.toFixed(1)}:1`;
}
