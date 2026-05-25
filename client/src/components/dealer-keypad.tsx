import { Card, ranks, suits } from "@shared/schema";
import { isRedSuit } from "@/lib/poker-utils";
import { cn } from "@/lib/utils";
import { Check, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DealerKeypadProps {
  selectedCards: Card[];
  onCardSelect: (card: Card) => void;
  onCardClear: () => void;
  activeSlotName: string;
}

export function DealerKeypad({
  selectedCards,
  onCardSelect,
  onCardClear,
  activeSlotName,
}: DealerKeypadProps) {
  const isCardInUse = (card: Card) => {
    return selectedCards.some((c) => c.rank === card.rank && c.suit === card.suit);
  };

  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-4 backdrop-blur-sm border border-yellow-500 border-opacity-30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-bold text-sm">⚡ QUICK DEAL PAD</span>
          <span className="text-xs text-gray-400 hidden sm:inline">• Tap cards to deal instantly</span>
        </div>
        <div className="flex items-center gap-2">
          {activeSlotName && (
            <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded text-xs font-semibold animate-pulse">
              Active: {activeSlotName}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onCardClear}
            className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-950/20"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear Active
          </Button>
        </div>
      </div>

      <div className="space-y-2 overflow-x-auto pb-1 no-touch-highlight">
        {suits.map((suit) => (
          <div key={suit} className="flex gap-1 justify-center min-w-[500px]">
            {/* Suit Label on Left */}
            <div
              className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-lg select-none",
                isRedSuit(suit) ? "bg-red-950/30 text-red-500" : "bg-gray-900 text-gray-400"
              )}
            >
              {suit}
            </div>

            {/* Ranks for this Suit */}
            <div className="flex gap-1 flex-1">
              {ranks.map((rank) => {
                const card: Card = { rank, suit };
                const inUse = isCardInUse(card);

                return (
                  <button
                    key={`${rank}${suit}`}
                    disabled={inUse}
                    onClick={() => onCardSelect(card)}
                    className={cn(
                      "flex-1 h-10 sm:h-12 text-xs sm:text-sm font-bold rounded-lg flex flex-col items-center justify-center transition-all duration-150",
                      inUse
                        ? "bg-gray-800/20 text-gray-600 border border-gray-800 cursor-not-allowed opacity-30"
                        : cn(
                            "bg-white border-2 border-gray-300 hover:border-yellow-400 hover:scale-105 active:scale-95 shadow-sm",
                            isRedSuit(suit) ? "text-red-600" : "text-black"
                          )
                    )}
                  >
                    <span>{rank}</span>
                    <span className="text-[10px] sm:text-xs leading-none mt-0.5">{suit}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
