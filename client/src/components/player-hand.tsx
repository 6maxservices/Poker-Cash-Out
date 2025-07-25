import { useState } from "react";
import { Card, GameVariant } from "@shared/schema";
import { CardSelectorModal } from "./card-selector-modal";
import { cn } from "@/lib/utils";
import { isRedSuit, formatCurrency, calculatePotOdds } from "@/lib/poker-utils";
import { Plus, User, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlayerHandProps {
  playerNumber: 1 | 2;
  cards: Card[];
  equity: number;
  moneyEquity: number;
  feePercentage: number;
  gameVariant: GameVariant;
  onCardSelect: (card: Card) => void;
  onCardDeselect: (index: number) => void;
  selectedCards: Card[];
}

export function PlayerHand({
  playerNumber,
  cards,
  equity,
  moneyEquity,
  feePercentage,
  gameVariant,
  onCardSelect,
  onCardDeselect,
  selectedCards
}: PlayerHandProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cashoutStatus, setCashoutStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const maxCards = gameVariant === 'nlh' ? 2 : gameVariant === 'plo4' ? 4 : 5;
  const potOdds = calculatePotOdds(equity);
  
  // Calculate net payout after fees
  const feeAmount = moneyEquity * (feePercentage / 100);
  const netPayout = moneyEquity - feeAmount;
  
  const handleCardSelect = (card: Card) => {
    onCardSelect(card);
    setIsModalOpen(false);
  };

  const handleApproveCashout = () => {
    setCashoutStatus('approved');
    // TODO: Add API call to approve cashout
    console.log(`Player ${playerNumber} cashout approved: ${formatCurrency(netPayout)}`);
  };

  const handleRejectCashout = () => {
    setCashoutStatus('rejected');
    // TODO: Add API call to reject cashout
    console.log(`Player ${playerNumber} cashout rejected`);
  };

  const handleRequestCashout = () => {
    setCashoutStatus('pending');
    // TODO: Add API call to request cashout
    console.log(`Player ${playerNumber} cashout requested: ${formatCurrency(netPayout)}`);
  };

  const renderCardSlot = (index: number) => {
    const card = cards[index];
    
    if (card) {
      return (
        <div 
          className="card-selected w-16 h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:opacity-75 transition-opacity relative group"
          onClick={() => onCardDeselect(index)}
          title="Click to deselect card"
        >
          <div className={cn(
            "text-sm font-semibold",
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
          <div className="absolute inset-0 bg-red-500 bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200"></div>
        </div>
      );
    }

    return (
      <div 
        className={cn(
          "card-slot w-16 h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer",
          index >= maxCards && "opacity-50"
        )}
        onClick={index < maxCards ? () => setIsModalOpen(true) : undefined}
      >
        <Plus className="text-gray-400 w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-4 backdrop-blur-sm border border-yellow-500 border-opacity-30">
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-white mb-2">
          <User className="inline text-yellow-500 mr-2" size={18} />
          Player {playerNumber}
        </h3>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {[0, 1, 2, 3, 4].map(index => (
          <div key={index} className={cn(
            index >= maxCards && gameVariant === 'nlh' && "hidden"
          )}>
            {renderCardSlot(index)}
          </div>
        ))}
      </div>

      <div className={cn(
        "rounded-lg p-3 border",
        playerNumber === 1 ? "equity-glow bg-green-600 bg-opacity-20 border-green-500" : "bg-red-600 bg-opacity-20 border-red-500"
      )}>
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold mb-1",
            playerNumber === 1 ? "text-green-400" : "text-red-400"
          )}>
            {equity.toFixed(1)}%
          </div>
          <div className="text-sm text-white mb-1">Equity</div>
          <div className="text-lg font-bold text-yellow-500">
            {formatCurrency(netPayout)}
          </div>
          <div className="text-xs text-gray-300">
            Net Payout ({feePercentage}% fee)
          </div>
          {feeAmount > 0 && (
            <div className="text-xs text-red-400 mt-1">
              Fee: -{formatCurrency(feeAmount)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 bg-black bg-opacity-40 rounded-lg p-2">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Pot Odds</div>
          <div className="text-sm font-semibold text-white">{potOdds}</div>
        </div>
      </div>

      {/* Cashout Controls */}
      <div className="mt-3 space-y-2">
        {cashoutStatus === null && netPayout > 0 && (
          <Button
            onClick={handleRequestCashout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
            size="sm"
          >
            Request Cashout
          </Button>
        )}

        {cashoutStatus === 'pending' && (
          <div className="space-y-2">
            <div className="text-center text-orange-400 text-sm font-semibold">
              Cashout Pending
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleApproveCashout}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 text-sm"
                size="sm"
              >
                <Check className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={handleRejectCashout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 text-sm"
                size="sm"
              >
                <X className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {cashoutStatus === 'approved' && (
          <div className="bg-green-600 bg-opacity-20 border border-green-500 rounded-lg p-2 text-center">
            <div className="text-green-400 font-bold text-sm mb-1">
              <Check className="inline mr-1 h-4 w-4" />
              CASHOUT APPROVED
            </div>
            <div className="text-white text-xs">
              Amount: {formatCurrency(netPayout)}
            </div>
          </div>
        )}

        {cashoutStatus === 'rejected' && (
          <div className="bg-red-600 bg-opacity-20 border border-red-500 rounded-lg p-2 text-center">
            <div className="text-red-400 font-bold text-sm mb-1">
              <X className="inline mr-1 h-4 w-4" />
              CASHOUT REJECTED
            </div>
            <div className="text-white text-xs">
              Player continues in hand
            </div>
          </div>
        )}
      </div>

      <CardSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCardSelect={handleCardSelect}
        selectedCards={selectedCards}
        title={`Select Card for Player ${playerNumber}`}
      />
    </div>
  );
}
