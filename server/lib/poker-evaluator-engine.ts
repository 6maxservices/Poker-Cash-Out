import * as PokerEvaluator from 'poker-evaluator';
import { Card, GameVariant, Hand, CommunityCards } from '@shared/schema';

// Convert our card format to poker-evaluator format
function convertCardToEvaluatorFormat(card: Card): string {
  const rankMap: Record<string, string> = {
    'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': 'T', 'J': 'J', 'Q': 'Q', 'K': 'K'
  };
  
  const suitMap: Record<string, string> = {
    '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c'
  };
  
  return rankMap[card.rank] + suitMap[card.suit];
}

// Create a deck excluding specific cards
function createDeck(excludedCards: Card[]): Card[] {
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
  const suits = ['♠', '♥', '♦', '♣'];
  const deck: Card[] = [];
  
  for (const rank of ranks) {
    for (const suit of suits) {
      deck.push({ rank: rank as any, suit: suit as any });
    }
  }
  
  // Remove excluded cards
  const filteredDeck = deck.filter(card => 
    !excludedCards.some(excluded => 
      excluded.rank === card.rank && excluded.suit === card.suit
    )
  );
  
  // Debug: Verify exclusion worked
  if (excludedCards.length > 0) {
    console.log(`DEBUG DECK EXCLUSION: Started with ${deck.length} cards, excluded ${excludedCards.length} cards, remaining: ${filteredDeck.length}`);
    const excludedRanks = excludedCards.map(c => c.rank);
    const remainingOfSameRank = filteredDeck.filter(c => excludedRanks.includes(c.rank));
    console.log(`DEBUG: Cards of excluded ranks still in deck: ${remainingOfSameRank.map(c => c.rank + c.suit).join(', ')}`);
  }
  
  return filteredDeck;
}

// Shuffle array in place
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Get best 5-card hand for Omaha variants
function getBestOmahaHand(holeCards: Card[], boardCards: Card[]): string[] {
  if (holeCards.length < 4 || boardCards.length < 3) {
    return [];
  }
  
  let bestHand: string[] = [];
  let bestValue = -1;
  
  // Must use exactly 2 cards from hole cards and 3 from board
  for (let i = 0; i < holeCards.length; i++) {
    for (let j = i + 1; j < holeCards.length; j++) {
      for (let k = 0; k < boardCards.length; k++) {
        for (let l = k + 1; l < boardCards.length; l++) {
          for (let m = l + 1; m < boardCards.length; m++) {
            const hand = [
              convertCardToEvaluatorFormat(holeCards[i]),
              convertCardToEvaluatorFormat(holeCards[j]),
              convertCardToEvaluatorFormat(boardCards[k]),
              convertCardToEvaluatorFormat(boardCards[l]),
              convertCardToEvaluatorFormat(boardCards[m])
            ];
            
            try {
              const evaluation = PokerEvaluator.evalHand(hand);
              if (evaluation.value > bestValue) {
                bestValue = evaluation.value;
                bestHand = hand;
              }
            } catch (error) {
              console.error('Hand evaluation error:', error, hand);
            }
          }
        }
      }
    }
  }
  
  return bestHand;
}

// Evaluate hand strength using poker-evaluator
export function evaluateHand(cards: Card[], gameVariant: GameVariant): number {
  if (cards.length < 5) {
    return 0; // Invalid hand
  }
  
  try {
    const evaluatorCards = cards.map(convertCardToEvaluatorFormat);
    const result = PokerEvaluator.evalHand(evaluatorCards);
    return result.value;
  } catch (error) {
    console.error('Hand evaluation error:', error, cards);
    return 0;
  }
}

// Get the best possible hand for a player given their hole cards and board
export function getBestHand(holeCards: Card[], boardCards: Card[], gameVariant: GameVariant): Card[] {
  switch (gameVariant) {
    case 'nlh':
      // Texas Hold'em: use any 5 cards from 7 available
      const allCards = [...holeCards, ...boardCards];
      if (allCards.length < 5) return allCards;
      
      let bestValue = -1;
      let bestHand: Card[] = [];
      
      // Check all possible 5-card combinations
      for (let i = 0; i < allCards.length; i++) {
        for (let j = i + 1; j < allCards.length; j++) {
          for (let k = j + 1; k < allCards.length; k++) {
            for (let l = k + 1; l < allCards.length; l++) {
              for (let m = l + 1; m < allCards.length; m++) {
                const hand = [allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]];
                const value = evaluateHand(hand, gameVariant);
                if (value > bestValue) {
                  bestValue = value;
                  bestHand = hand;
                }
              }
            }
          }
        }
      }
      return bestHand;
      
    case 'plo4':
    case 'plo5':
      // Omaha: must use exactly 2 from hole cards, 3 from board
      if (holeCards.length < 2 || boardCards.length < 3) {
        return [];
      }
      
      let bestOmahaValue = -1;
      let bestOmahaHand: Card[] = [];
      
      // Try all combinations of 2 hole cards with 3 board cards
      for (let i = 0; i < holeCards.length; i++) {
        for (let j = i + 1; j < holeCards.length; j++) {
          for (let k = 0; k < boardCards.length; k++) {
            for (let l = k + 1; l < boardCards.length; l++) {
              for (let m = l + 1; m < boardCards.length; m++) {
                const hand = [holeCards[i], holeCards[j], boardCards[k], boardCards[l], boardCards[m]];
                const value = evaluateHand(hand, gameVariant);
                if (value > bestOmahaValue) {
                  bestOmahaValue = value;
                  bestOmahaHand = hand;
                }
              }
            }
          }
        }
      }
      return bestOmahaHand;
      
    default:
      return holeCards.concat(boardCards).slice(0, 5);
  }
}

// Monte Carlo simulation using poker-evaluator
export function runMonteCarloSimulation(
  player1Hand: Hand,
  player2Hand: Hand,
  communityCards: CommunityCards,
  gameVariant: GameVariant,
  burnedCards: Card[] = [],
  iterations: number = 20000
): { player1Wins: number; player2Wins: number; ties: number } {
  console.log('Monte Carlo calculation - Total deck: 52 cards');
  
  // Collect all known cards
  const knownCards: Card[] = [];
  knownCards.push(...player1Hand.cards);
  knownCards.push(...player2Hand.cards);
  knownCards.push(...burnedCards);
  
  if (communityCards.flop) knownCards.push(...communityCards.flop);
  if (communityCards.turn) knownCards.push(communityCards.turn);
  if (communityCards.river) knownCards.push(communityCards.river);
  
  console.log(`Known cards (excluded): ${knownCards.length} - Community: ${(communityCards.flop?.length || 0) + (communityCards.turn ? 1 : 0) + (communityCards.river ? 1 : 0)}, Player1: ${player1Hand.cards.length}, Player2: ${player2Hand.cards.length}, Burned: ${burnedCards.length}`);
  
  // Create available deck
  const availableDeck = createDeck(knownCards);
  console.log(`Available deck size: ${availableDeck.length}`);
  
  if (burnedCards.length > 0) {
    console.log(`Burned cards: ${burnedCards.map(c => c.rank + c.suit).join(', ')}`);
  }
  
  console.log(`Player 1 hand: ${player1Hand.cards.map(c => c.rank + c.suit).join(', ')}`);
  console.log(`Player 2 hand: ${player2Hand.cards.map(c => c.rank + c.suit).join(', ')}`);
  console.log(`All known cards: ${knownCards.map(c => c.rank + c.suit).join(', ')}`);
  
  let player1Wins = 0;
  let player2Wins = 0;
  let ties = 0;
  
  for (let i = 0; i < iterations; i++) {
    // Shuffle deck for this iteration
    const deck = shuffle([...availableDeck]);
    let deckIndex = 0;
    
    // Complete the board
    const board: Card[] = [];
    
    // Add existing community cards
    if (communityCards.flop) board.push(...communityCards.flop);
    if (communityCards.turn) board.push(communityCards.turn);
    if (communityCards.river) board.push(communityCards.river);
    
    // Fill missing community cards
    while (board.length < 5 && deckIndex < deck.length) {
      board.push(deck[deckIndex++]);
    }
    
    if (board.length < 5) continue; // Skip if we can't complete the board
    
    // Get best hands for each player
    const player1BestHand = getBestHand(player1Hand.cards, board, gameVariant);
    const player2BestHand = getBestHand(player2Hand.cards, board, gameVariant);
    
    if (player1BestHand.length < 5 || player2BestHand.length < 5) continue;
    
    // Evaluate hands
    const player1Strength = evaluateHand(player1BestHand, gameVariant);
    const player2Strength = evaluateHand(player2BestHand, gameVariant);
    
    // Compare hands
    if (player1Strength > player2Strength) {
      player1Wins++;
    } else if (player2Strength > player1Strength) {
      player2Wins++;
    } else {
      ties++;
    }
  }
  
  console.log(`Results: P1 wins: ${player1Wins}, P2 wins: ${player2Wins}, Ties: ${ties}`);
  console.log(`Percentages: P1: ${(player1Wins / iterations * 100).toFixed(1)}%, P2: ${(player2Wins / iterations * 100).toFixed(1)}%, Ties: ${(ties / iterations * 100).toFixed(1)}%`);
  
  if (burnedCards.length > 0) {
    // Count remaining relevant cards in deck for analysis
    const relevantCards = ['K', 'A']; // Focus on high cards for analysis
    const remainingRelevant = availableDeck.filter(card => relevantCards.includes(card.rank));
    console.log(`Burned cards effect: Available ${remainingRelevant.filter(c => c.rank === 'K').length} kings remaining in deck`);
  }
  
  return { player1Wins, player2Wins, ties };
}