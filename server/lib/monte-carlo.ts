import { Card, GameVariant, Hand, CommunityCards, EquityResult } from "@shared/schema";
import { runMonteCarloSimulation } from "./poker-evaluator-engine";

export function calculateEquity(
  gameVariant: GameVariant,
  communityCards: CommunityCards,
  player1Hand: Hand,
  player2Hand: Hand,
  potAmount: number,
  iterations: number = 20000,
  burnedCards: Card[] = []
): EquityResult {
  const startTime = Date.now();
  
  // Use the new poker-evaluator-based Monte Carlo simulation
  const { player1Wins, player2Wins, ties } = runMonteCarloSimulation(
    player1Hand,
    player2Hand,
    communityCards,
    gameVariant,
    burnedCards,
    iterations
  );
  
  const calculationTime = (Date.now() - startTime) / 1000;
  
  const player1Equity = ((player1Wins + ties / 2) / iterations) * 100;
  const player2Equity = ((player2Wins + ties / 2) / iterations) * 100;
  const tiePercentage = (ties / iterations) * 100;
  
  return {
    player1Equity,
    player2Equity,
    tiePercentage,
    player1MoneyEquity: (player1Equity / 100) * potAmount,
    player2MoneyEquity: (player2Equity / 100) * potAmount,
    iterations,
    calculationTime
  };
}

// Legacy functions - now using PokerStove comparison
function compareHandEvaluations(eval1: any, eval2: any): number {
  // This function is no longer used - replaced by PokerStove comparison
  return 0;
}