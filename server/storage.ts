import { type EquityCalculation, type EquityResult, type Calculation, calculations } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // For future expansion - could store calculation history
  saveCalculation(calculation: EquityCalculation, result: EquityResult): Promise<string>;
  getCalculation(id: string): Promise<{ calculation: EquityCalculation; result: EquityResult } | undefined>;
  getRecentCalculations(limit?: number): Promise<Calculation[]>;
}

export class DatabaseStorage implements IStorage {
  async saveCalculation(calculation: EquityCalculation, result: EquityResult): Promise<string> {
    if (!db) throw new Error("Database not initialized");
    const [saved] = await db
      .insert(calculations)
      .values({
        gameVariant: calculation.gameVariant,
        communityCards: calculation.communityCards,
        player1Hand: calculation.player1Hand,
        player2Hand: calculation.player2Hand,
        potAmount: calculation.potAmount,
        player1Equity: result.player1Equity,
        player2Equity: result.player2Equity,
        player1MoneyEquity: result.player1MoneyEquity,
        player2MoneyEquity: result.player2MoneyEquity,
        iterations: result.iterations,
        calculationTime: result.calculationTime,
        photo: calculation.photo,
      })
      .returning();
    
    return saved.id.toString();
  }

  async getCalculation(id: string): Promise<{ calculation: EquityCalculation; result: EquityResult } | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [calc] = await db
      .select()
      .from(calculations)
      .where(eq(calculations.id, parseInt(id)));

    if (!calc) return undefined;

    return {
      calculation: {
        gameVariant: calc.gameVariant as any,
        communityCards: calc.communityCards as any,
        player1Hand: calc.player1Hand as any,
        player2Hand: calc.player2Hand as any,
        potAmount: calc.potAmount,
        burnedCards: [], // Not stored in database currently
        photo: calc.photo || undefined,
      },
      result: {
        player1Equity: calc.player1Equity,
        player2Equity: calc.player2Equity,
        player1MoneyEquity: calc.player1MoneyEquity,
        player2MoneyEquity: calc.player2MoneyEquity,
        tiePercentage: 0, // Not stored in database currently
        iterations: calc.iterations,
        calculationTime: calc.calculationTime,
      },
    };
  }

  async getRecentCalculations(limit: number = 10): Promise<Calculation[]> {
    if (!db) return [];
    return await db
      .select()
      .from(calculations)
      .orderBy(calculations.createdAt)
      .limit(limit);
  }
}

export class MemStorage implements IStorage {
  private calculations: Map<string, Calculation> = new Map();
  private currentId = 1;

  async saveCalculation(calculation: EquityCalculation, result: EquityResult): Promise<string> {
    const id = this.currentId++;
    const newCalc: Calculation = {
      id,
      gameVariant: calculation.gameVariant,
      communityCards: calculation.communityCards,
      player1Hand: calculation.player1Hand,
      player2Hand: calculation.player2Hand,
      potAmount: calculation.potAmount,
      player1Equity: result.player1Equity,
      player2Equity: result.player2Equity,
      player1MoneyEquity: result.player1MoneyEquity,
      player2MoneyEquity: result.player2MoneyEquity,
      iterations: result.iterations,
      calculationTime: result.calculationTime,
      photo: calculation.photo || null,
      createdAt: new Date(),
    };
    this.calculations.set(id.toString(), newCalc);
    return id.toString();
  }

  async getCalculation(id: string): Promise<{ calculation: EquityCalculation; result: EquityResult } | undefined> {
    const calc = this.calculations.get(id);
    if (!calc) return undefined;
    return {
      calculation: {
        gameVariant: calc.gameVariant as any,
        communityCards: calc.communityCards as any,
        player1Hand: calc.player1Hand as any,
        player2Hand: calc.player2Hand as any,
        potAmount: calc.potAmount,
        burnedCards: [],
        photo: calc.photo || undefined,
      },
      result: {
        player1Equity: calc.player1Equity,
        player2Equity: calc.player2Equity,
        player1MoneyEquity: calc.player1MoneyEquity,
        player2MoneyEquity: calc.player2MoneyEquity,
        tiePercentage: 0,
        iterations: calc.iterations,
        calculationTime: calc.calculationTime,
      },
    };
  }

  async getRecentCalculations(limit: number = 10): Promise<Calculation[]> {
    return Array.from(this.calculations.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = db ? new DatabaseStorage() : new MemStorage();
