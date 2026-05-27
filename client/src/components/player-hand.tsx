import { useState, useEffect } from "react";
import { Card, GameVariant } from "@shared/schema";
import { CardSelectorModal } from "./card-selector-modal";
import { BatchCardModal } from "./batch-card-modal";
import { cn } from "@/lib/utils";
import { isRedSuit, formatCurrency, calculatePotOdds } from "@/lib/poker-utils";
import { Plus, User, Check, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SlotTarget {
  type: 'player1' | 'player2' | 'flop' | 'turn' | 'river';
  index?: number;
}

interface PlayerHandProps {
  playerNumber: 1 | 2;
  cards: Card[];
  equity: number;
  moneyEquity: number;
  feePercentage: number;
  gameVariant: GameVariant;
  onCardSelect: (card: Card, index: number) => void;
  onCardDeselect: (index: number) => void;
  onBatchCardSelect?: (cards: Card[]) => void;
  selectedCards: Card[];
  onCashoutStatusChange?: (playerNumber: 1 | 2, status: 'pending' | 'approved' | 'rejected' | null) => void;
  resetCashoutStatus?: boolean;
  activeSlot: SlotTarget | null;
  onSlotClick: (target: SlotTarget) => void;
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
  onBatchCardSelect,
  selectedCards,
  onCashoutStatusChange,
  resetCashoutStatus,
  activeSlot,
  onSlotClick
}: PlayerHandProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [cashoutStatus, setCashoutStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  // Reset cashout status when new hand starts
  useEffect(() => {
    if (resetCashoutStatus) {
      setCashoutStatus(null);
      onCashoutStatusChange?.(playerNumber, null);
    }
  }, [resetCashoutStatus, playerNumber, onCashoutStatusChange]);
  const maxCards = gameVariant === 'nlh' ? 2 : gameVariant === 'plo4' ? 4 : 5;
  const potOdds = calculatePotOdds(equity);
  
  // Calculate net payout after fees
  const feeAmount = moneyEquity * (feePercentage / 100);
  const netPayout = moneyEquity - feeAmount;
  
  const handleCardSelect = (card: Card) => {
    // Determine active slot index, or fallback to append
    const currentIdx = activeSlot?.type === `player${playerNumber}` ? (activeSlot.index ?? cards.length) : cards.length;
    onCardSelect(card, currentIdx);
    setIsModalOpen(false);
  };

  const handleApproveCashout = () => {
    setCashoutStatus('approved');
    onCashoutStatusChange?.(playerNumber, 'approved');
    // TODO: Add API call to approve cashout
    console.log(`Player ${playerNumber} cashout approved: ${formatCurrency(netPayout)}`);
  };

  const handleRejectCashout = () => {
    setCashoutStatus('rejected');
    onCashoutStatusChange?.(playerNumber, 'rejected');
    // TODO: Add API call to reject cashout
    console.log(`Player ${playerNumber} cashout rejected`);
  };

  const handleRequestCashout = () => {
    setCashoutStatus('pending');
    onCashoutStatusChange?.(playerNumber, 'pending');
    // TODO: Add API call to request cashout
    console.log(`Player ${playerNumber} cashout requested: ${formatCurrency(netPayout)}`);
  };

  const renderCardSlot = (index: number) => {
    const card = cards && cards[index];
    const isSlotActive = activeSlot?.type === `player${playerNumber}` && activeSlot?.index === index;
    
    if (card) {
      return (
        <div 
          className={cn(
            "card-selected w-12 h-18 md:w-14 md:h-20 lg:w-16 lg:h-24 xl:w-18 xl:h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:opacity-75 transition-all relative group min-w-[40px] min-h-[40px]",
            isSlotActive && "ring-2 ring-yellow-400 border-yellow-400 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.6)]"
          )}
          onClick={() => {
            if (isSlotActive) {
              setIsModalOpen(true);
            } else {
              onSlotClick({ type: `player${playerNumber}`, index });
            }
          }}
          onDoubleClick={() => {
            onCardDeselect(index);
            onSlotClick({ type: `player${playerNumber}`, index });
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
      );
    }

    return (
      <div 
        className={cn(
          "card-slot w-12 h-18 md:w-14 md:h-20 lg:w-16 lg:h-24 xl:w-18 xl:h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer min-w-[40px] min-h-[40px] transition-all duration-200",
          index >= maxCards && "opacity-50",
          isSlotActive && "ring-2 ring-yellow-400 border-yellow-400 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.6)]"
        )}
        onClick={index < maxCards ? () => {
          if (isSlotActive) {
            setIsModalOpen(true);
          } else {
            onSlotClick({ type: `player${playerNumber}`, index });
          }
        } : undefined}
        onDoubleClick={index < maxCards ? () => setIsModalOpen(true) : undefined}
        title="Click to select as active slot, double click to open card selector"
      >
        <Plus className="text-gray-400 w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-2.5 md:p-3 xl:p-4 backdrop-blur-sm border border-yellow-500 border-opacity-30 flex flex-col justify-between h-full">
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm md:text-base font-bold text-white flex items-center">
            <User className="inline text-yellow-500 mr-1.5" size={16} />
            Player {playerNumber}
          </h3>
          {onBatchCardSelect && (
            <Button
              onClick={() => setIsBatchModalOpen(true)}
              variant="outline"
              size="sm"
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-950/20 text-[10px] font-semibold py-0.5 h-6 flex items-center gap-1 rounded-md"
            >
              <Layers className="h-2.5 w-2.5" />
              Batch Select
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mb-2 md:mb-3">
        {[0, 1, 2, 3, 4].map(index => (
          <div key={index} className={cn(
            index >= maxCards && gameVariant === 'nlh' && "hidden"
          )}>
            {renderCardSlot(index)}
          </div>
        ))}
      </div>

      <div className={cn(
        "rounded-lg p-2 md:p-2.5 border",
        playerNumber === 1 ? "equity-glow bg-green-600 bg-opacity-20 border-green-500" : "bg-red-600 bg-opacity-20 border-red-500"
      )}>
        <div className="text-center">
          <div className={cn(
            "text-xl md:text-2xl font-bold mb-0.5",
            playerNumber === 1 ? "text-green-400" : "text-red-400"
          )}>
            {equity.toFixed(1)}%
          </div>
          <div className="text-[10px] md:text-xs text-white mb-0.5">Equity</div>
          <div className="text-sm md:text-lg font-black text-yellow-500">
            {formatCurrency(netPayout)}
          </div>
          <div className="text-[9px] md:text-xs text-gray-300">
            Net Payout ({feePercentage}% fee)
          </div>
          {feeAmount > 0 && (
            <div className="text-[9px] md:text-xs text-red-400 mt-0.5">
              Fee: -{formatCurrency(feeAmount)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 bg-black bg-opacity-40 rounded-lg p-1.5">
        <div className="text-center flex justify-between items-center px-1.5">
          <span className="text-[9px] md:text-xs text-gray-400">Pot Odds</span>
          <span className="text-[10px] md:text-sm font-semibold text-white">{potOdds}</span>
        </div>
      </div>

      {/* Cashout Controls */}
      <div className="mt-2 space-y-1.5">
        {cashoutStatus === null && netPayout > 0 && (
          <Button
            onClick={handleRequestCashout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 min-h-[48px]"
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
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-sm min-h-[48px]"
                size="sm"
              >
                <Check className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={handleRejectCashout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-sm min-h-[48px]"
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

      {onBatchCardSelect && (
        <BatchCardModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          initialCards={cards}
          maxCards={maxCards}
          onFinish={onBatchCardSelect}
          otherSelectedCards={selectedCards.filter(c => !cards.some(pc => pc && pc.rank === c.rank && pc.suit === c.suit))}
          title={`Select Player ${playerNumber} Hand (${gameVariant.toUpperCase()})`}
        />
      )}
    </div>
  );
}
