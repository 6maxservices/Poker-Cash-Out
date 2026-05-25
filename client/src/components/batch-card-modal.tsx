import { useState, useEffect } from "react";
import { Card, ranks, suits } from "@shared/schema";
import { isRedSuit } from "@/lib/poker-utils";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Trash2, Check, Lock, Layers } from "lucide-react";

interface BatchCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCards: Card[];
  maxCards: number;
  onFinish: (cards: Card[]) => void;
  otherSelectedCards: Card[];
  title?: string;
}

export function BatchCardModal({
  isOpen,
  onClose,
  initialCards,
  maxCards,
  onFinish,
  otherSelectedCards,
  title = "Batch Card Selection"
}: BatchCardModalProps) {
  // Local temporary state for batch selection
  const [tempSelected, setTempSelected] = useState<Card[]>([]);

  // Reset local state when modal opens with initial cards
  useEffect(() => {
    if (isOpen) {
      // Filter out any undefined/null cards in initialCards
      setTempSelected(initialCards.filter(c => c && c.rank && c.suit));
    }
  }, [isOpen, initialCards]);

  const isCardInTempSelected = (card: Card) => {
    return tempSelected.some(c => c.rank === card.rank && c.suit === card.suit);
  };

  const getSelectionIndex = (card: Card) => {
    return tempSelected.findIndex(c => c.rank === card.rank && c.suit === card.suit);
  };

  const isCardDisabled = (card: Card) => {
    return otherSelectedCards.some(c => c.rank === card.rank && c.suit === card.suit);
  };

  const handleCardClick = (card: Card) => {
    if (isCardDisabled(card)) return;

    if (isCardInTempSelected(card)) {
      // Deselect
      setTempSelected(prev => prev.filter(c => !(c.rank === card.rank && c.suit === card.suit)));
    } else {
      // Select (if we haven't reached the limit)
      if (tempSelected.length < maxCards) {
        setTempSelected(prev => [...prev, card]);
      }
    }
  };

  const removeCardAt = (index: number) => {
    setTempSelected(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  const handleApply = () => {
    onFinish(tempSelected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] bg-gradient-to-br from-gray-900 via-gray-950 to-black border border-yellow-500/40 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden p-6 rounded-2xl flex flex-col">
        
        <DialogHeader className="pb-3 border-b border-gray-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-yellow-400 tracking-wide uppercase">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400 mt-0.5">
                Batch entry console. Select cards sequentially in dealer order.
              </DialogDescription>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 text-gray-400 hover:text-white rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Live Selection Preview Strip */}
        <div className="bg-black/50 border border-gray-800/60 rounded-xl p-3 my-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-semibold">
            <span>SELECTION SEQUENCE ({tempSelected.length} / {maxCards})</span>
            {tempSelected.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-red-400 hover:text-red-300 hover:bg-red-950/20 text-[10px] h-6 px-2 font-bold transition-colors"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="flex gap-2.5 overflow-x-auto py-1 min-h-[90px] items-center justify-center sm:justify-start">
            {Array.from({ length: maxCards }).map((_, idx) => {
              const card = tempSelected[idx];
              if (card) {
                return (
                  <div
                    key={`preview-${idx}-${card.rank}-${card.suit}`}
                    className="relative group animate-in zoom-in-75 duration-200"
                  >
                    <div className="w-14 h-20 bg-white border-2 border-yellow-500 rounded-lg flex flex-col items-center justify-center shadow-lg relative min-w-[44px] min-h-[44px]">
                      {/* Badge representing order index */}
                      <span className="absolute top-1 left-1 bg-yellow-500 text-black text-[9px] font-black h-3.5 w-3.5 rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className={cn(
                        "text-sm font-extrabold leading-none mt-1",
                        isRedSuit(card.suit) ? "text-red-600" : "text-black"
                      )}>
                        {card.rank}
                      </div>
                      <div className={cn(
                        "text-lg leading-none mt-0.5",
                        isRedSuit(card.suit) ? "text-red-600" : "text-black"
                      )}>
                        {card.suit}
                      </div>
                      
                      {/* Hover clear button */}
                      <button
                        onClick={() => removeCardAt(idx)}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 transition-colors shadow-md border border-black/10 opacity-0 group-hover:opacity-100 duration-200"
                        title="Remove Card"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`preview-empty-${idx}`}
                  className="w-14 h-20 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center text-gray-600 text-[10px] font-bold bg-gray-950/30"
                >
                  Slot {idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* 52-Card Grid Organized by Suit Rows */}
        <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-4">
          {suits.map(suit => (
            <div key={suit} className="bg-black/20 border border-gray-800/30 rounded-xl p-3">
              <div className={cn(
                "text-xs font-black tracking-wider uppercase mb-2 px-1",
                isRedSuit(suit) ? "text-red-400" : "text-gray-400"
              )}>
                {suit === '♠' ? 'Spades ♠' : suit === '♥' ? 'Hearts ♥' : suit === '♦' ? 'Diamonds ♦' : 'Clubs ♣'}
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-13 gap-1.5 justify-items-center">
                {ranks.map(rank => {
                  const card: Card = { rank, suit };
                  const selected = isCardInTempSelected(card);
                  const selectedIndex = getSelectionIndex(card);
                  const disabled = isCardDisabled(card);
                  
                  return (
                    <div
                      key={`${rank}${suit}`}
                      onClick={() => handleCardClick(card)}
                      className={cn(
                        "w-10 h-14 sm:w-11 sm:h-15 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative group min-w-[32px]",
                        selected
                          ? "bg-gradient-to-b from-yellow-300 to-yellow-500 border-2 border-yellow-200 scale-105 shadow-[0_0_12px_rgba(234,179,8,0.5)] z-10"
                          : disabled
                            ? "opacity-25 bg-gray-900 border border-gray-800 cursor-not-allowed"
                            : "bg-white border border-gray-300 hover:border-yellow-500 hover:scale-105 hover:shadow-md"
                      )}
                    >
                      {/* Selection Sequence Number Badge */}
                      {selected && (
                        <div className="absolute -top-1.5 -right-1.5 bg-black text-yellow-400 font-extrabold text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center border border-yellow-400 shadow-md">
                          {selectedIndex + 1}
                        </div>
                      )}

                      {/* Padlock Icon for Disabled Cards */}
                      {disabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 rounded-lg text-gray-500">
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                      )}

                      <div className={cn(
                        "text-[11px] font-black leading-none",
                        selected
                          ? "text-black"
                          : isRedSuit(suit) ? "text-red-600" : "text-black"
                      )}>
                        {rank}
                      </div>
                      <div className={cn(
                        "text-sm leading-none mt-0.5",
                        selected
                          ? "text-black"
                          : isRedSuit(suit) ? "text-red-600" : "text-black"
                      )}>
                        {suit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer Controls */}
        <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between gap-3 bg-gradient-to-t from-gray-950 to-transparent">
          <div className="text-[10px] text-gray-400 font-medium hidden sm:block">
            Cards in use elsewhere are locked automatically.
          </div>
          <div className="flex gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-initial border-gray-700 text-gray-300 hover:bg-gray-800 h-10 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white shadow-lg h-10 font-bold text-xs flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              Apply Batch Selection
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
