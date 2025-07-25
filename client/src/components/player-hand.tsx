import { Card, GameVariant } from "@shared/schema";
import { CardSelector } from "./card-selector";
import { cn } from "@/lib/utils";
import { isRedSuit, formatCurrency, calculatePotOdds } from "@/lib/poker-utils";
import { Plus, User } from "lucide-react";

interface PlayerHandProps {
  playerNumber: 1 | 2;
  cards: Card[];
  equity: number;
  moneyEquity: number;
  gameVariant: GameVariant;
  onCardSelect: (card: Card) => void;
  onCardDeselect: (card: Card) => void;
  selectedCards: Card[];
  showSelector: boolean;
  onToggleSelector: () => void;
}

export function PlayerHand({
  playerNumber,
  cards,
  equity,
  moneyEquity,
  gameVariant,
  onCardSelect,
  onCardDeselect,
  selectedCards,
  showSelector,
  onToggleSelector
}: PlayerHandProps) {
  const maxCards = gameVariant === 'nlh' ? 2 : gameVariant === 'plo4' ? 4 : 5;
  const potOdds = calculatePotOdds(equity);
  
  const handleCardSelect = (card: Card) => {
    onCardSelect(card);
    onToggleSelector();
  };

  const renderCardSlot = (index: number) => {
    const card = cards[index];
    
    if (card) {
      return (
        <div className="card-selected w-20 h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer">
          <div className={cn(
            "text-lg font-semibold",
            isRedSuit(card.suit) ? "text-red-600" : "text-black"
          )}>
            {card.rank}
          </div>
          <div className={cn(
            "text-xl",
            isRedSuit(card.suit) ? "text-red-600" : "text-black"
          )}>
            {card.suit}
          </div>
        </div>
      );
    }

    return (
      <div 
        className={cn(
          "card-slot w-20 h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer",
          index >= maxCards && "opacity-50"
        )}
        onClick={index < maxCards ? onToggleSelector : undefined}
      >
        <Plus className="text-gray-400 w-6 h-6" />
      </div>
    );
  };

  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-6 backdrop-blur-sm border border-yellow-500 border-opacity-30">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-white mb-2">
          <User className="inline text-yellow-500 mr-2" size={20} />
          Player {playerNumber}
        </h3>
      </div>

      <div className="flex justify-center gap-3 mb-6">
        {[0, 1, 2, 3, 4].map(index => (
          <div key={index} className={cn(
            index >= maxCards && gameVariant === 'nlh' && "hidden"
          )}>
            {renderCardSlot(index)}
          </div>
        ))}
      </div>

      <div className={cn(
        "rounded-lg p-4 border",
        playerNumber === 1 ? "equity-glow bg-green-600 bg-opacity-20 border-green-500" : "bg-red-600 bg-opacity-20 border-red-500"
      )}>
        <div className="text-center">
          <div className={cn(
            "text-3xl font-bold mb-2",
            playerNumber === 1 ? "text-green-400" : "text-red-400"
          )}>
            {equity.toFixed(1)}%
          </div>
          <div className="text-lg text-white mb-1">Equity</div>
          <div className="text-2xl font-bold text-yellow-500">
            {formatCurrency(moneyEquity)}
          </div>
          <div className="text-sm text-gray-300">Expected Value</div>
        </div>
      </div>

      <div className="mt-4 bg-black bg-opacity-40 rounded-lg p-3">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">Pot Odds</div>
          <div className="text-lg font-semibold text-white">{potOdds}</div>
        </div>
      </div>

      {showSelector && (
        <div className="mt-4">
          <CardSelector
            selectedCards={selectedCards}
            onCardSelect={handleCardSelect}
            onCardDeselect={onCardDeselect}
            disabledCards={selectedCards}
          />
        </div>
      )}
    </div>
  );
}
