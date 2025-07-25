import { type EquityCalculation, type EquityResult } from "@shared/schema";

export interface IStorage {
  // For future expansion - could store calculation history
  saveCalculation(calculation: EquityCalculation, result: EquityResult): Promise<string>;
  getCalculation(id: string): Promise<{ calculation: EquityCalculation; result: EquityResult } | undefined>;
}

export class MemStorage implements IStorage {
  private calculations: Map<string, { calculation: EquityCalculation; result: EquityResult }>;

  constructor() {
    this.calculations = new Map();
  }

  async saveCalculation(calculation: EquityCalculation, result: EquityResult): Promise<string> {
    const id = Date.now().toString();
    this.calculations.set(id, { calculation, result });
    return id;
  }

  async getCalculation(id: string): Promise<{ calculation: EquityCalculation; result: EquityResult } | undefined> {
    return this.calculations.get(id);
  }
}

export const storage = new MemStorage();
