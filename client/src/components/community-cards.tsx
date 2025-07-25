import { Card } from "@shared/schema";
import { CardSelector } from "./card-selector";
import { cn } from "@/lib/utils";
import { isRedSuit } from "@/lib/poker-utils";
import { Plus } from "lucide-react";

interface CommunityCardsProps {
  flop: Card[];
  turn?: Card;
  river?: Card;
  onCardSelect: (card: Card, position: 'flop' | 'turn' | 'river') => void;
  selectedCards: Card[];
  showSelector: boolean;
  onToggleSelector: () => void;
}

export function CommunityCards({
  flop,
  turn,
  river,
  onCardSelect,
  selectedCards,
  showSelector,
  onToggleSelector
}: CommunityCardsProps) {
  const handleCardSelect = (card: Card) => {
    if (flop.length < 3) {
      onCardSelect(card, 'flop');
    } else if (!turn) {
      onCardSelect(card, 'turn');
    } else if (!river) {
      onCardSelect(card, 'river');
    }
    onToggleSelector();
  };

  const handleCardDeselect = (card: Card) => {
    // Remove card logic would go here
  };

  const renderCard = (card: Card | undefined, label: string, onClick?: () => void) => {
    if (card) {
      return (
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-2">{label}</div>
          <div className="card-selected w-16 h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer">
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
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="text-sm text-gray-400 mb-2">{label}</div>
        <div 
          className="card-slot w-16 h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer"
          onClick={onClick}
        >
          <Plus className="text-gray-400 w-6 h-6" />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-6 mb-8 backdrop-blur-sm border border-yellow-500 border-opacity-30">
      <h2 className="text-xl font-bold text-white mb-4 text-center">
        <span className="text-yellow-500 mr-2">🃏</span>
        Community Cards
      </h2>
      
      <div className="flex justify-center gap-3 mb-6">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-2">FLOP</div>
          <div className="flex gap-2">
            {[0, 1, 2].map(index => (
              <div key={index}>
                {flop[index] ? (
                  <div className="card-selected w-16 h-24 rounded-lg flex flex-col items-center justify-center">
                    <div className={cn(
                      "text-lg font-semibold",
                      isRedSuit(flop[index].suit) ? "text-red-600" : "text-black"
                    )}>
                      {flop[index].rank}
                    </div>
                    <div className={cn(
                      "text-xl",
                      isRedSuit(flop[index].suit) ? "text-red-600" : "text-black"
                    )}>
                      {flop[index].suit}
                    </div>
                  </div>
                ) : (
                  <div 
                    className="card-slot w-16 h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer"
                    onClick={onToggleSelector}
                  >
                    <Plus className="text-gray-400 w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {renderCard(turn, "TURN", onToggleSelector)}
        {renderCard(river, "RIVER", onToggleSelector)}
      </div>

      {showSelector && (
        <CardSelector
          selectedCards={selectedCards}
          onCardSelect={handleCardSelect}
          onCardDeselect={handleCardDeselect}
          disabledCards={selectedCards}
        />
      )}
    </div>
  );
}
