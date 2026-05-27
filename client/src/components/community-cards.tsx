import { useState } from "react";
import { Card } from "@shared/schema";
import { CardSelectorModal } from "./card-selector-modal";
import { BatchCardModal } from "./batch-card-modal";
import { cn } from "@/lib/utils";
import { isRedSuit } from "@/lib/poker-utils";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

import { SlotTarget } from "./player-hand";

interface CommunityCardsProps {
  flop: Card[];
  turn?: Card;
  river?: Card;
  onCardSelect: (card: Card, position: 'flop' | 'turn' | 'river', index?: number) => void;
  onCardDeselect: (position: 'flop' | 'turn' | 'river', index?: number) => void;
  onBatchCardSelect?: (cards: Card[]) => void;
  selectedCards: Card[];
  activeSlot: SlotTarget | null;
  onSlotClick: (target: SlotTarget) => void;
}

export function CommunityCards({
  flop,
  turn,
  river,
  onCardSelect,
  onCardDeselect,
  onBatchCardSelect,
  selectedCards,
  activeSlot,
  onSlotClick
}: CommunityCardsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<'flop' | 'turn' | 'river'>('flop');

  const handleCardSlotClick = (position: 'flop' | 'turn' | 'river') => {
    setCurrentPosition(position);
    setIsModalOpen(true);
  };

  const handleCardSelect = (card: Card) => {
    const currentIdx = activeSlot?.type === 'flop' ? activeSlot.index : undefined;
    onCardSelect(card, currentPosition, currentIdx);
    setIsModalOpen(false);
  };

  const renderCard = (card: Card | undefined, label: string, position: 'turn' | 'river') => {
    const isSlotActive = activeSlot?.type === position;
    if (card) {
      return (
        <div className="text-center">
          <div className="text-[10px] md:text-xs text-gray-400 mb-1">{label}</div>
          <div 
            className={cn(
              "card-selected w-12 h-18 md:w-14 md:h-20 lg:w-16 lg:h-24 xl:w-18 xl:h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:opacity-75 transition-all relative group min-w-[40px] min-h-[40px]",
              isSlotActive && "ring-2 ring-yellow-400 border-yellow-400 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.6)]"
            )}
            onClick={() => {
              if (isSlotActive) {
                setCurrentPosition(position);
                setIsModalOpen(true);
              } else {
                onSlotClick({ type: position });
              }
            }}
            onDoubleClick={() => {
              onCardDeselect(position);
              onSlotClick({ type: position });
            }}
            title="Click to select as active slot, double click to clear card"
          >
            <div className={cn(
              "text-xs md:text-sm font-semibold",
              isRedSuit(card.suit) ? "text-red-600" : "text-black"
            )}>
              {card.rank}
            </div>
            <div className={cn(
              "text-sm md:text-lg leading-none",
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
        <div className="text-[10px] md:text-xs text-gray-400 mb-1">{label}</div>
        <div 
          className={cn(
            "card-slot w-12 h-18 md:w-14 md:h-20 lg:w-16 lg:h-24 xl:w-18 xl:h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer min-w-[40px] min-h-[40px] transition-all duration-200",
            isSlotActive && "ring-2 ring-yellow-400 border-yellow-400 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.6)]"
          )}
          onClick={() => {
            if (isSlotActive) {
              setCurrentPosition(position);
              setIsModalOpen(true);
            } else {
              onSlotClick({ type: position });
            }
          }}
          onDoubleClick={() => {
            setCurrentPosition(position);
            setIsModalOpen(true);
          }}
          title="Click to select as active slot, double click to open card selector"
        >
          <Plus className="text-gray-400 w-4 h-4" />
        </div>
      </div>
    );
  };

  const currentBoardCards = [
    ...flop,
    ...(turn ? [turn] : []),
    ...(river ? [river] : [])
  ];

  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-2.5 md:p-3 xl:p-4 mb-2 md:mb-3 backdrop-blur-sm border border-yellow-500 border-opacity-30">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm md:text-base font-bold text-white flex items-center">
          <span className="text-yellow-500 mr-1.5">🃏</span>
          Community Board <span className="text-[10px] text-gray-400 font-normal ml-2 hidden sm:inline">(Optional for Preflop)</span>
        </h2>
        {onBatchCardSelect && (
          <Button
            onClick={() => setIsBatchModalOpen(true)}
            variant="outline"
            size="sm"
            className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-950/20 text-[10px] font-semibold py-0.5 h-6 flex items-center gap-1 rounded-md"
          >
            <Layers className="h-2.5 w-2.5" />
            Batch Board
          </Button>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center gap-2 md:gap-3">
        <div className="text-center">
          <div className="text-[10px] md:text-xs text-gray-400 mb-1">FLOP</div>
          <div className="flex gap-1.5 justify-center">
            {[0, 1, 2].map(index => {
              const isSlotActive = activeSlot?.type === 'flop' && activeSlot?.index === index;
              return (
                <div key={index}>
                  {flop && flop[index] ? (
                    <div 
                      className={cn(
                        "card-selected w-12 h-18 md:w-14 md:h-20 lg:w-16 lg:h-24 xl:w-18 xl:h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:opacity-75 transition-all relative group min-w-[40px] min-h-[40px]",
                        isSlotActive && "ring-2 ring-yellow-400 border-yellow-400 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.6)]"
                      )}
                      onClick={() => {
                        if (isSlotActive) {
                          setCurrentPosition('flop');
                          setIsModalOpen(true);
                        } else {
                          onSlotClick({ type: 'flop', index });
                        }
                      }}
                      onDoubleClick={() => {
                        onCardDeselect('flop', index);
                        onSlotClick({ type: 'flop', index });
                      }}
                      title="Click to select as active slot, double click to clear card"
                    >
                      <div className={cn(
                        "text-xs md:text-sm font-semibold",
                        isRedSuit(flop[index].suit) ? "text-red-600" : "text-black"
                      )}>
                        {flop[index].rank}
                      </div>
                      <div className={cn(
                        "text-sm md:text-lg leading-none",
                        isRedSuit(flop[index].suit) ? "text-red-600" : "text-black"
                      )}>
                        {flop[index].suit}
                      </div>
                      <div className="absolute inset-0 bg-red-500 bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200"></div>
                    </div>
                  ) : (
                    <div 
                      className={cn(
                        "card-slot w-12 h-18 md:w-14 md:h-20 lg:w-16 lg:h-24 xl:w-18 xl:h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer min-w-[40px] min-h-[40px] transition-all duration-200",
                        isSlotActive && "ring-2 ring-yellow-400 border-yellow-400 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.6)]"
                      )}
                      onClick={() => {
                        if (isSlotActive) {
                          setCurrentPosition('flop');
                          setIsModalOpen(true);
                        } else {
                          onSlotClick({ type: 'flop', index });
                        }
                      }}
                      onDoubleClick={() => {
                        setCurrentPosition('flop');
                        setIsModalOpen(true);
                      }}
                      title="Click to select as active slot, double click to open card selector"
                    >
                      <Plus className="text-gray-400 w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 md:gap-3 justify-center">
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

      {onBatchCardSelect && (
        <BatchCardModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          initialCards={currentBoardCards}
          maxCards={5}
          onFinish={onBatchCardSelect}
          otherSelectedCards={selectedCards.filter(c => !currentBoardCards.some(bc => bc && bc.rank === c.rank && bc.suit === c.suit))}
          title="Select Community Board (Flop, Turn, River)"
        />
      )}
    </div>
  );
}
