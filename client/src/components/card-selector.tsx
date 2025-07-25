import { Card, ranks, suits } from "@shared/schema";
import { isRedSuit } from "@/lib/poker-utils";
import { cn } from "@/lib/utils";

interface CardSelectorProps {
  selectedCards: Card[];
  onCardSelect: (card: Card) => void;
  onCardDeselect: (card: Card) => void;
  disabledCards?: Card[];
}

export function CardSelector({ selectedCards, onCardSelect, onCardDeselect, disabledCards = [] }: CardSelectorProps) {
  const isCardSelected = (card: Card) => {
    return selectedCards.some(c => c.rank === card.rank && c.suit === card.suit);
  };

  const isCardDisabled = (card: Card) => {
    return disabledCards.some(c => c.rank === card.rank && c.suit === card.suit);
  };

  const handleCardClick = (card: Card) => {
    if (isCardDisabled(card)) return;
    
    if (isCardSelected(card)) {
      onCardDeselect(card);
    } else {
      onCardSelect(card);
    }
  };

  return (
    <div className="bg-black bg-opacity-40 rounded-lg p-4">
      <div className="text-sm text-gray-400 mb-3 text-center">Select Cards</div>
      <div className="grid grid-cols-13 gap-1 max-w-4xl mx-auto">
        {ranks.map(rank => 
          suits.map(suit => {
            const card: Card = { rank, suit };
            const selected = isCardSelected(card);
            const disabled = isCardDisabled(card);
            
            return (
              <div
                key={`${rank}${suit}`}
                onClick={() => handleCardClick(card)}
                className={cn(
                  "w-8 h-12 text-xs rounded flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
                  "hover:scale-105",
                  selected && "card-selected",
                  !selected && !disabled && "card-slot",
                  disabled && "opacity-30 cursor-not-allowed",
                  disabled && "bg-gray-600"
                )}
              >
                <div className={cn(
                  "font-semibold",
                  isRedSuit(suit) ? "text-red-600" : "text-black"
                )}>
                  {rank}
                </div>
                <div className={cn(
                  "text-sm",
                  isRedSuit(suit) ? "text-red-600" : "text-black"
                )}>
                  {suit}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
