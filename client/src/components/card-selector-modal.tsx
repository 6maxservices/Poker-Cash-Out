import { Card, ranks, suits } from "@shared/schema";
import { isRedSuit } from "@/lib/poker-utils";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CardSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardSelect: (card: Card) => void;
  selectedCards: Card[];
  title?: string;
}

export function CardSelectorModal({ 
  isOpen, 
  onClose, 
  onCardSelect, 
  selectedCards, 
  title = "Select Card" 
}: CardSelectorModalProps) {
  const isCardSelected = (card: Card) => {
    return selectedCards.some(c => c.rank === card.rank && c.suit === card.suit);
  };

  const handleCardClick = (card: Card) => {
    if (isCardSelected(card)) return;
    onCardSelect(card);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-gray-900 border-yellow-500 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white text-center">
            {title}
          </DialogTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {/* Organize by suits in rows */}
          <div className="space-y-3">
            {suits.map(suit => (
              <div key={suit} className="text-center">
                <div className={cn(
                  "text-sm font-semibold mb-2",
                  isRedSuit(suit) ? "text-red-400" : "text-gray-300"
                )}>
                  {suit === '♠' ? 'Spades' : suit === '♥' ? 'Hearts' : suit === '♦' ? 'Diamonds' : 'Clubs'}
                </div>
                <div className="flex justify-center gap-1 flex-wrap">
                  {ranks.map(rank => {
                    const card: Card = { rank, suit };
                    const selected = isCardSelected(card);
                    
                    return (
                      <div
                        key={`${rank}${suit}`}
                        onClick={() => handleCardClick(card)}
                        className={cn(
                          "w-12 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
                          "border-2 hover:scale-105",
                          selected 
                            ? "opacity-30 cursor-not-allowed bg-gray-700 border-gray-600" 
                            : "bg-white border-gray-300 hover:border-yellow-500 hover:shadow-lg"
                        )}
                      >
                        <div className={cn(
                          "text-sm font-bold",
                          isRedSuit(suit) ? "text-red-600" : "text-black"
                        )}>
                          {rank}
                        </div>
                        <div className={cn(
                          "text-lg",
                          isRedSuit(suit) ? "text-red-600" : "text-black"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}