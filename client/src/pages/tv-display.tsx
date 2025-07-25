import { useState, useEffect } from "react";
import { Card, GameVariant } from "@shared/schema";
import { formatCurrency } from "@/lib/poker-utils";
import { cn } from "@/lib/utils";
import { Spade, Heart, DollarSign, Trophy } from "lucide-react";

interface TVBroadcastData {
  gameVariant: GameVariant;
  potAmount: number;
  player1Cards: Card[];
  player2Cards: Card[];
  player1Equity: number;
  player2Equity: number;
  player1CashoutAmount: number;
  player2CashoutAmount: number;
  player1CashoutStatus: 'pending' | 'approved' | 'rejected' | null;
  player2CashoutStatus: 'pending' | 'approved' | 'rejected' | null;
  timestamp: number;
}

function CardDisplay({ card }: { card: Card }) {
  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <div className="bg-white rounded-xl shadow-2xl p-4 w-20 h-28 flex flex-col items-center justify-center border-2 border-gray-300">
      <div className={cn(
        "text-2xl font-bold mb-1",
        isRed ? "text-red-600" : "text-black"
      )}>
        {card.rank}
      </div>
      <div className={cn(
        "text-3xl",
        isRed ? "text-red-600" : "text-black"
      )}>
        {card.suit}
      </div>
    </div>
  );
}

function PlayerSection({ 
  playerNumber, 
  cards, 
  equity, 
  cashoutAmount, 
  cashoutStatus 
}: {
  playerNumber: 1 | 2;
  cards: Card[];
  equity: number;
  cashoutAmount: number;
  cashoutStatus: 'pending' | 'approved' | 'rejected' | null;
}) {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border-4 border-yellow-500 shadow-2xl">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold text-white mb-3">
          PLAYER {playerNumber}
        </h2>

        {/* Cards */}
        <div className="flex justify-center gap-3 mb-4">
          {cards.map((card, index) => (
            <CardDisplay key={index} card={card} />
          ))}
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 2 - cards.length) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-gray-600 rounded-xl p-4 w-20 h-28 flex items-center justify-center border-2 border-gray-500"
            >
              <div className="text-gray-400 text-xl">?</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Equity */}
        <div className="bg-blue-600 bg-opacity-30 rounded-2xl p-4 border-2 border-blue-400">
          <div className="text-center">
            <div className="text-lg text-white mb-1 font-semibold">EQUITY</div>
            <div className="text-4xl font-bold text-blue-300">
              {equity.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Cashout Amount */}
        <div className="bg-green-600 bg-opacity-30 rounded-2xl p-4 border-2 border-green-400">
          <div className="text-center">
            <div className="text-lg text-white mb-1 font-semibold">CASHOUT</div>
            <div className="text-3xl font-bold text-green-300">
              {formatCurrency(cashoutAmount)}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={cn(
          "rounded-2xl p-4 border-2 text-center",
          cashoutStatus === 'pending' && "bg-orange-600 bg-opacity-30 border-orange-400",
          cashoutStatus === 'approved' && "bg-green-600 bg-opacity-30 border-green-400",
          cashoutStatus === 'rejected' && "bg-red-600 bg-opacity-30 border-red-400",
          !cashoutStatus && "bg-gray-600 bg-opacity-30 border-gray-400"
        )}>
          <div className={cn(
            "text-2xl font-bold",
            cashoutStatus === 'pending' && "text-orange-300",
            cashoutStatus === 'approved' && "text-green-300",
            cashoutStatus === 'rejected' && "text-red-300",
            !cashoutStatus && "text-gray-300"
          )}>
            {cashoutStatus === 'pending' && "PENDING"}
            {cashoutStatus === 'approved' && "APPROVED"}
            {cashoutStatus === 'rejected' && "REJECTED"}
            {!cashoutStatus && "READY"}
          </div>
        </div>
      </div>

      {/* Celebration for approved cashouts */}
      {cashoutStatus === 'approved' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 rounded-3xl">
          <div className="text-center">
            <Trophy className="text-yellow-400 mx-auto mb-3" size={60} />
            <div className="text-3xl font-bold text-yellow-400 mb-2">CASHOUT!</div>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(cashoutAmount)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TVDisplay() {
  const [gameData, setGameData] = useState<TVBroadcastData>({
    gameVariant: 'nlh' as GameVariant,
    potAmount: 100,
    player1Cards: [],
    player2Cards: [],
    player1Equity: 0,
    player2Equity: 0,
    player1CashoutAmount: 0,
    player2CashoutAmount: 0,
    player1CashoutStatus: null,
    player2CashoutStatus: null,
    timestamp: Date.now(),
  });

  const [lastTimestamp, setLastTimestamp] = useState<number>(0);

  // Poll localStorage for updates
  useEffect(() => {
    console.log('TV Display: Starting polling...');

    const poll = () => {
      try {
        const stored = localStorage.getItem('poker-tv-broadcast');
        if (stored) {
          const data = JSON.parse(stored) as TVBroadcastData;

          if (data.timestamp !== lastTimestamp) {
            console.log('TV Display: Data updated!', {
              pot: data.potAmount,
              player1Equity: data.player1Equity,
              player2Equity: data.player2Equity
            });
            setGameData(data);
            setLastTimestamp(data.timestamp);
          }
        }
      } catch (error) {
        console.error('TV Display: Polling error:', error);
      }
    };

    // Initial load
    poll();

    // Poll every 100ms
    const interval = setInterval(poll, 100);

    return () => clearInterval(interval);
  }, [lastTimestamp]);

  const getGameVariantDisplay = (variant: GameVariant) => {
    switch (variant) {
      case 'nlh': return 'NO LIMIT HOLD\'EM';
      case 'plo4': return 'PLO4 (4-CARD OMAHA)';
      case 'plo5': return 'PLO5 (5-CARD OMAHA)';
      default: return String(variant).toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-5xl font-bold text-white mb-3">
          <Spade className="inline text-yellow-500 mr-3" size={48} />
          POKER LIVE TV
          <Heart className="inline text-red-500 ml-3" size={48} />
        </h1>

        {/* Game Info Bar */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-2xl p-4 mb-6 border-4 border-yellow-400 shadow-2xl">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-black font-bold text-xl mb-1 uppercase tracking-wide">
                GAME VARIANT
              </div>
              <div className="text-black font-bold text-2xl">
                {getGameVariantDisplay(gameData.gameVariant)}
              </div>
            </div>

            <div className="text-center">
              <div className="text-black font-bold text-xl mb-1 uppercase tracking-wide">
                POT AMOUNT
              </div>
              <div className="flex items-center justify-center">
                <DollarSign className="text-black mr-2" size={32} />
                <span className="text-black font-bold text-2xl">
                  {formatCurrency(gameData.potAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-8 max-w-6xl mx-auto">
        <div className="relative">
          <PlayerSection
            playerNumber={1}
            cards={gameData.player1Cards}
            equity={gameData.player1Equity}
            cashoutAmount={gameData.player1CashoutAmount}
            cashoutStatus={gameData.player1CashoutStatus}
          />
        </div>

        <div className="relative">
          <PlayerSection
            playerNumber={2}
            cards={gameData.player2Cards}
            equity={gameData.player2Equity}
            cashoutAmount={gameData.player2CashoutAmount}
            cashoutStatus={gameData.player2CashoutStatus}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-gray-400">
        <p className="text-lg">LIVE EQUITY DISPLAY • REAL-TIME UPDATES</p>
        <p className="text-sm mt-1">Last update: {new Date(gameData.timestamp).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}