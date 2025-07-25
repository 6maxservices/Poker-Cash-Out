import { Card, GameVariant, Hand, CommunityCards, EquityResult } from "@shared/schema";
import { createDeck, evaluateHand, cardToString } from "./poker-engine";

export function calculateEquity(
  gameVariant: GameVariant,
  communityCards: CommunityCards,
  player1Hand: Hand,
  player2Hand: Hand,
  potAmount: number,
  iterations: number = 20000
): EquityResult {
  const startTime = Date.now();
  
  let player1Wins = 0;
  let player2Wins = 0;
  let ties = 0;

  // Create deck and remove known cards
  const knownCards = new Set<string>();
  
  // Add community cards to known cards
  [...communityCards.flop, communityCards.turn, communityCards.river]
    .filter(Boolean)
    .forEach(card => knownCards.add(cardToString(card!)));
  
  // Add player hands to known cards
  player1Hand.cards.forEach(card => knownCards.add(cardToString(card)));
  player2Hand.cards.forEach(card => knownCards.add(cardToString(card)));

  const availableDeck = createDeck().filter(card => !knownCards.has(cardToString(card)));

  for (let i = 0; i < iterations; i++) {
    // Shuffle available deck
    const shuffledDeck = [...availableDeck];
    for (let j = shuffledDeck.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffledDeck[j], shuffledDeck[k]] = [shuffledDeck[k], shuffledDeck[j]];
    }

    // Complete community cards
    const completeCommunity = completeBoard(communityCards, shuffledDeck);
    
    // Get player cards based on game variant
    const player1Cards = getPlayerCards(player1Hand, gameVariant, completeCommunity);
    const player2Cards = getPlayerCards(player2Hand, gameVariant, completeCommunity);

    // Evaluate hands
    const player1Eval = evaluateHand(player1Cards);
    const player2Eval = evaluateHand(player2Cards);

    // Compare hands
    const comparison = compareHandEvaluations(player1Eval, player2Eval);
    if (comparison > 0) {
      player1Wins++;
    } else if (comparison < 0) {
      player2Wins++;
    } else {
      ties++;
    }
  }

  const calculationTime = (Date.now() - startTime) / 1000;
  
  const player1Equity = ((player1Wins + ties / 2) / iterations) * 100;
  const player2Equity = ((player2Wins + ties / 2) / iterations) * 100;

  return {
    player1Equity,
    player2Equity,
    player1MoneyEquity: (potAmount * player1Equity) / 100,
    player2MoneyEquity: (potAmount * player2Equity) / 100,
    iterations,
    calculationTime
  };
}

function completeBoard(communityCards: CommunityCards, deck: Card[]): Card[] {
  const board: Card[] = [...communityCards.flop];
  let deckIndex = 0;

  // Fill flop to 3 cards if needed
  while (board.length < 3) {
    board.push(deck[deckIndex++]);
  }

  // Add turn
  if (communityCards.turn) {
    board.push(communityCards.turn);
  } else {
    board.push(deck[deckIndex++]);
  }

  // Add river
  if (communityCards.river) {
    board.push(communityCards.river);
  } else {
    board.push(deck[deckIndex++]);
  }

  return board;
}

function getPlayerCards(hand: Hand, gameVariant: GameVariant, board: Card[]): Card[] {
  switch (gameVariant) {
    case 'nlh':
      return [...hand.cards, ...board];
    case 'plo4':
    case 'plo5':
      // In Omaha, must use exactly 2 cards from hand and 3 from board
      return [...hand.cards, ...board];
    default:
      return [...hand.cards, ...board];
  }
}

function compareHandEvaluations(eval1: any, eval2: any): number {
  if (eval1.rank !== eval2.rank) {
    return eval1.rank - eval2.rank;
  }
  
  if (eval1.value !== eval2.value) {
    return eval1.value - eval2.value;
  }
  
  for (let i = 0; i < Math.max(eval1.kickers.length, eval2.kickers.length); i++) {
    const kicker1 = eval1.kickers[i] || 0;
    const kicker2 = eval2.kickers[i] || 0;
    if (kicker1 !== kicker2) {
      return kicker1 - kicker2;
    }
  }
  
  return 0;
}
