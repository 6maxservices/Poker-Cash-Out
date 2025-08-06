import { useState } from "react";
import { Card } from "@shared/schema";
import { CardSelectorModal } from "./card-selector-modal";
import { cn } from "@/lib/utils";
import { isRedSuit } from "@/lib/poker-utils";
import { Plus } from "lucide-react";

interface CommunityCardsProps {
  flop: Card[];
  turn?: Card;
  river?: Card;
  onCardSelect: (card: Card, position: 'flop' | 'turn' | 'river') => void;
  onCardDeselect: (position: 'flop' | 'turn' | 'river', index?: number) => void;
  selectedCards: Card[];
}

export function CommunityCards({
  flop,
  turn,
  river,
  onCardSelect,
  onCardDeselect,
  selectedCards
}: CommunityCardsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<'flop' | 'turn' | 'river'>('flop');

  const handleCardSlotClick = (position: 'flop' | 'turn' | 'river') => {
    setCurrentPosition(position);
    setIsModalOpen(true);
  };

  const handleCardSelect = (card: Card) => {
    onCardSelect(card, currentPosition);
    setIsModalOpen(false);
  };

  const renderCard = (card: Card | undefined, label: string, position: 'flop' | 'turn' | 'river') => {
    if (card) {
      return (
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-2">{label}</div>
          <div 
            className="card-selected w-18 h-28 sm:w-16 sm:h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:opacity-75 transition-opacity relative group min-w-[44px] min-h-[44px]"
            onClick={() => onCardDeselect(position)}
            title="Click to deselect card"
          >
            <div className={cn(
              "text-lg sm:text-lg font-semibold",
              isRedSuit(card.suit) ? "text-red-600" : "text-black"
            )}>
              {card.rank}
            </div>
            <div className={cn(
              "text-xl sm:text-xl",
              isRedSuit(card.suit) ? "text-red-600" : "text-black"
            )}>
              {card.suit}
            </div>
            <div className="absolute inset-0 bg-red-500 bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="text-sm text-gray-400 mb-2">{label}</div>
        <div 
          className="card-slot w-18 h-28 sm:w-16 sm:h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer min-w-[44px] min-h-[44px]"
          onClick={() => handleCardSlotClick(position)}
        >
          <Plus className="text-gray-400 w-6 h-6" />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-4 mb-6 backdrop-blur-sm border border-yellow-500 border-opacity-30">
      <h2 className="text-lg font-bold text-white mb-3 text-center">
        <span className="text-yellow-500 mr-2">🃏</span>
        Community Cards <span className="text-sm text-gray-400 font-normal">(Optional for Preflop)</span>
      </h2>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-3">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-2">FLOP</div>
          <div className="flex gap-2 justify-center">
            {[0, 1, 2].map(index => (
              <div key={index}>
                {flop && flop[index] ? (
                  <div 
                    className="card-selected w-18 h-28 sm:w-16 sm:h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:opacity-75 transition-opacity relative group min-w-[44px] min-h-[44px]"
                    onClick={() => onCardDeselect('flop', index)}
                    title="Click to deselect card"
                  >
                    <div className={cn(
                      "text-lg sm:text-lg font-semibold",
                      isRedSuit(flop[index].suit) ? "text-red-600" : "text-black"
                    )}>
                      {flop[index].rank}
                    </div>
                    <div className={cn(
                      "text-xl sm:text-xl",
                      isRedSuit(flop[index].suit) ? "text-red-600" : "text-black"
                    )}>
                      {flop[index].suit}
                    </div>
                    <div className="absolute inset-0 bg-red-500 bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200"></div>
                  </div>
                ) : (
                  <div 
                    className="card-slot w-18 h-28 sm:w-16 sm:h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer min-w-[44px] min-h-[44px]"
                    onClick={() => handleCardSlotClick('flop')}
                  >
                    <Plus className="text-gray-400 w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 sm:gap-3 justify-center">
          {renderCard(turn, "TURN", 'turn')}
          {renderCard(river, "RIVER", 'river')}
        </div>
      </div>

      <CardSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCardSelect={handleCardSelect}
        selectedCards={selectedCards}
        title={`Select ${currentPosition.charAt(0).toUpperCase() + currentPosition.slice(1)} Card`}
      />
    </div>
  );
}
