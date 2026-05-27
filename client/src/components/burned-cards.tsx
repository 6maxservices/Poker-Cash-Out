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
    <div className="bg-black bg-opacity-60 rounded-xl p-2 md:p-2.5 mb-2 md:mb-3 backdrop-blur-sm border border-red-500 border-opacity-30">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm md:text-base font-bold text-white flex items-center">
          <Flame className="inline text-red-500 mr-1.5" size={16} />
          Burned Cards <span className="text-[10px] text-gray-400 font-normal ml-2 hidden sm:inline">(Excluded)</span>
        </h2>
        <div className="flex items-center gap-1">
          {onBatchCardSelect && (
            <Button
              onClick={() => setIsBatchModalOpen(true)}
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-950/20 text-[10px] font-semibold py-0.5 h-6 flex items-center gap-1 rounded-md"
            >
              <Layers className="h-2.5 w-2.5" />
              Batch Select
            </Button>
          )}
          {burnedCards.length > 0 && (
            <Button
              onClick={handleClearAll}
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-950/10 text-[9px] h-6 px-1.5 font-bold"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1.5 min-h-[44px] items-center">
        {burnedCards.map((card, index) => (
          <div
            key={`${card.rank}${card.suit}-${index}`}
            className="relative group cursor-pointer"
            onClick={() => onCardRemove(index)}
          >
            <div className="w-10 h-14 md:w-12 md:h-16 rounded-lg flex flex-col items-center justify-center bg-white border border-red-300 hover:border-red-400 hover:bg-red-50 transition-colors relative min-w-[40px] min-h-[40px]">
              <div className={cn(
                "text-[10px] md:text-xs font-bold leading-none",
                isRedSuit(card.suit) ? "text-red-600" : "text-black"
              )}>
                {card.rank}
              </div>
              <div className={cn(
                "text-xs md:text-sm leading-none mt-0.5",
                isRedSuit(card.suit) ? "text-red-600" : "text-black"
              )}>
                {card.suit}
              </div>
            </div>
          </div>
        ))}
        
        <div 
          className="w-10 h-14 md:w-12 md:h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer border border-dashed border-red-400 hover:border-red-300 hover:bg-red-500 hover:bg-opacity-10 transition-colors min-w-[40px] min-h-[40px]"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="text-red-400 w-3.5 h-3.5" />
          <span className="text-[9px] text-red-400 mt-0.5">Add</span>
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