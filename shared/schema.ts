import { z } from "zod";
import { pgTable, serial, text, real, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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
  burnedCards: z.array(cardSchema).default([]),
  photo: z.string().optional(), // Base64 hand photo
});

export type EquityCalculation = z.infer<typeof equityCalculationSchema>;

export const equityResultSchema = z.object({
  player1Equity: z.number().min(0).max(100),
  player2Equity: z.number().min(0).max(100),
  player1MoneyEquity: z.number().min(0),
  player2MoneyEquity: z.number().min(0),
  tiePercentage: z.number().min(0).max(100),
  iterations: z.number(),
  calculationTime: z.number(),
});

export type EquityResult = z.infer<typeof equityResultSchema>;

// Database tables
export const calculations = pgTable('calculations', {
  id: serial('id').primaryKey(),
  gameVariant: text('game_variant').notNull(),
  communityCards: jsonb('community_cards').notNull(),
  player1Hand: jsonb('player1_hand').notNull(),
  player2Hand: jsonb('player2_hand').notNull(),
  potAmount: real('pot_amount').notNull(),
  player1Equity: real('player1_equity').notNull(),
  player2Equity: real('player2_equity').notNull(),
  player1MoneyEquity: real('player1_money_equity').notNull(),
  player2MoneyEquity: real('player2_money_equity').notNull(),
  iterations: integer('iterations').notNull(),
  calculationTime: real('calculation_time').notNull(),
  photo: text('photo'), // Optional base64 hand photo
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertCalculationSchema = createInsertSchema(calculations).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertCalculation = z.infer<typeof insertCalculationSchema>;
export type Calculation = typeof calculations.$inferSelect;

export const hands = pgTable('hands', {
  id: serial('id').primaryKey(),
  handId: text('hand_id').notNull(),
  gameVariant: text('game_variant').notNull(),
  potAmount: real('pot_amount').notNull(),
  feePercentage: real('fee_percentage').notNull(),
  player1Cashed: boolean('player1_cashed').notNull(),
  player2Cashed: boolean('player2_cashed').notNull(),
  player1Payout: real('player1_payout').notNull(),
  player2Payout: real('player2_payout').notNull(),
  player1Fee: real('player1_fee').notNull(),
  player2Fee: real('player2_fee').notNull(),
  winner: text('winner').notNull(), // '1' | '2' | 'split' | 'unknown'
  houseProfit: real('house_profit').notNull(),
  photo: text('photo'), // Base64 hand photo
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertHandSchema = createInsertSchema(hands).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertHand = z.infer<typeof insertHandSchema>;
export type HandRecord = typeof hands.$inferSelect;
