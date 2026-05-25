import { useState } from "react";
import { Card } from "@shared/schema";
import { CardSelectorModal } from "./card-selector-modal";
import { BatchCardModal } from "./batch-card-modal";
import { cn } from "@/lib/utils";
import { isRedSuit } from "@/lib/poker-utils";
import { Plus, Flame, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BurnedCardsProps {
  burnedCards: Card[];
  onCardAdd: (card: Card) => void;
  onCardRemove: (index: number) => void;
  onBatchCardSelect?: (cards: Card[]) => void;
  selectedCards: Card[];
}

export function BurnedCards({
  burnedCards,
  onCardAdd,
  onCardRemove,
  onBatchCardSelect,
  selectedCards
}: BurnedCardsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

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
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-white flex items-center">
          <Flame className="inline text-red-500 mr-2" size={18} />
          Burned Cards <span className="text-xs text-gray-400 font-normal ml-2 hidden sm:inline">(Excluded from calculations)</span>
        </h2>
        <div className="flex items-center gap-1.5">
          {onBatchCardSelect && (
            <Button
              onClick={() => setIsBatchModalOpen(true)}
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-950/20 text-[10px] font-semibold py-1 h-7 flex items-center gap-1 rounded-lg"
            >
              <Layers className="h-3 w-3" />
              Batch Select
            </Button>
          )}
          {burnedCards.length > 0 && (
            <Button
              onClick={handleClearAll}
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-950/10 text-[10px] h-7 px-2 font-bold"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 min-h-[60px] items-center">
        {burnedCards.map((card, index) => (
          <div
            key={`${card.rank}${card.suit}-${index}`}
            className="relative group cursor-pointer"
            onClick={() => onCardRemove(index)}
          >
            <div className="w-16 h-20 sm:w-12 sm:h-16 rounded-lg flex flex-col items-center justify-center bg-white border-2 border-red-300 hover:border-red-400 hover:bg-red-50 transition-colors relative min-w-[44px] min-h-[44px]">
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
              {/* Remove X button - use direct click like community cards */}
            </div>
          </div>
        ))}
        
        <div 
          className="w-16 h-20 sm:w-12 sm:h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-red-400 hover:border-red-300 hover:bg-red-500 hover:bg-opacity-10 transition-colors min-w-[44px] min-h-[44px]"
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

      {onBatchCardSelect && (
        <BatchCardModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          initialCards={burnedCards}
          maxCards={10}
          onFinish={onBatchCardSelect}
          otherSelectedCards={selectedCards.filter(c => !burnedCards.some(bc => bc && bc.rank === c.rank && bc.suit === c.suit))}
          title="Select Burned Cards (Excluded from deck)"
        />
      )}
    </div>
  );
}