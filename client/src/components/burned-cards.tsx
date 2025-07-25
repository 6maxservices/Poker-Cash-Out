import { useState } from "react";
import { Card } from "@shared/schema";
import { CardSelectorModal } from "./card-selector-modal";
import { cn } from "@/lib/utils";
import { isRedSuit } from "@/lib/poker-utils";
import { Plus, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BurnedCardsProps {
  burnedCards: Card[];
  onCardAdd: (card: Card) => void;
  onCardRemove: (index: number) => void;
  selectedCards: Card[];
}

export function BurnedCards({
  burnedCards,
  onCardAdd,
  onCardRemove,
  selectedCards
}: BurnedCardsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardSelect = (card: Card) => {
    onCardAdd(card);
    setIsModalOpen(false);
  };

  const handleClearAll = () => {
    for (let i = burnedCards.length - 1; i >= 0; i--) {
      onCardRemove(i);
    }
  };

  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-3 mb-4 backdrop-blur-sm border border-red-500 border-opacity-30">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white">
          <Flame className="inline text-red-500 mr-2" size={18} />
          Burned Cards <span className="text-sm text-gray-400 font-normal">(Excluded from calculations)</span>
        </h2>
        {burnedCards.length > 0 && (
          <Button
            onClick={handleClearAll}
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-300 text-xs h-6"
          >
            Clear All
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 min-h-[60px] items-center">
        {burnedCards.map((card, index) => (
          <div
            key={`${card.rank}${card.suit}-${index}`}
            className="relative group"
          >
            <div className="w-12 h-16 rounded-lg flex flex-col items-center justify-center bg-white border-2 border-red-300 relative">
              <div className={cn(
                "text-sm font-bold",
                isRedSuit(card.suit) ? "text-red-600" : "text-black"
              )}>
                {card.rank}
              </div>
              <div className={cn(
                "text-lg",
                isRedSuit(card.suit) ? "text-red-600" : "text-black"
              )}>
                {card.suit}
              </div>
              <Button
                onClick={() => onCardRemove(index)}
                size="sm"
                variant="ghost"
                className="absolute -top-1 -right-1 w-4 h-4 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2 h-2" />
              </Button>
            </div>
          </div>
        ))}
        
        <div 
          className="w-12 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-red-400 hover:border-red-300 hover:bg-red-500 hover:bg-opacity-10 transition-colors"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="text-red-400 w-4 h-4" />
          <span className="text-xs text-red-400 mt-1">Add</span>
        </div>
      </div>

      <CardSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCardSelect={handleCardSelect}
        selectedCards={selectedCards}
        title="Select Burned Card"
      />
    </div>
  );
}