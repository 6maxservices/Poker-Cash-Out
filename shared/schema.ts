import { z } from "zod";

export const suits = ['♠', '♥', '♦', '♣'] as const;
export const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;

export type Suit = typeof suits[number];
export type Rank = typeof ranks[number];

export const cardSchema = z.object({
  rank: z.enum(ranks),
  suit: z.enum(suits),
});

export type Card = z.infer<typeof cardSchema>;

export const gameVariantSchema = z.enum(['nlh', 'plo4', 'plo5']);
export type GameVariant = z.infer<typeof gameVariantSchema>;

export const handSchema = z.object({
  cards: z.array(cardSchema).min(2).max(5),
});

export type Hand = z.infer<typeof handSchema>;

export const communityCardsSchema = z.object({
  flop: z.array(cardSchema).max(3).default([]),
  turn: cardSchema.optional(),
  river: cardSchema.optional(),
});

export type CommunityCards = z.infer<typeof communityCardsSchema>;

export const equityCalculationSchema = z.object({
  gameVariant: gameVariantSchema,
  communityCards: communityCardsSchema,
  player1Hand: handSchema,
  player2Hand: handSchema,
  potAmount: z.number().min(0),
});

export type EquityCalculation = z.infer<typeof equityCalculationSchema>;

export const equityResultSchema = z.object({
  player1Equity: z.number().min(0).max(100),
  player2Equity: z.number().min(0).max(100),
  player1MoneyEquity: z.number().min(0),
  player2MoneyEquity: z.number().min(0),
  iterations: z.number(),
  calculationTime: z.number(),
});

export type EquityResult = z.infer<typeof equityResultSchema>;
