
import { useState, useEffect } from "react";
import { Card, GameVariant, EquityResult } from "@shared/schema";
import { formatCurrency } from "@/lib/poker-utils";
import { cn } from "@/lib/utils";
import { tvBroadcaster, TVBroadcastData } from "@/lib/tv-broadcaster";
import { Trophy, Spade, Heart, DollarSign } from "lucide-react";

interface TVDisplayProps {
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
}

interface PlayerCashoutAnimationProps {
  isVisible: boolean;
  cashoutAmount: number;
  onAnimationEnd: () => void;
}

function PlayerCashoutAnimation({ isVisible, cashoutAmount, onAnimationEnd }: PlayerCashoutAnimationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onAnimationEnd, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onAnimationEnd]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm rounded-3xl cashout-animation">
      <div className="text-center">
        <div className="mb-6">
          <Trophy 
            className="text-yellow-400 mx-auto trophy-bounce" 
            size={120}
          />
        </div>
        <div className="text-6xl font-bold text-yellow-400 mb-6 animate-pulse">
          CASHOUT!
        </div>
        <div className="text-5xl font-bold text-green-400 mb-4">
          {formatCurrency(cashoutAmount)}
        </div>
        <div className="text-3xl text-white opacity-90 animate-pulse">
          🎉 Congratulations! 🎉
        </div>
      </div>
    </div>
  );
}

function CardDisplay({ card }: { card: Card }) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  
  return (
    <div className="bg-white rounded-xl shadow-2xl p-4 w-24 h-36 flex flex-col items-center justify-center border-2 border-gray-300">
      <div className={cn(
        "text-3xl font-bold mb-2",
        isRed ? "text-red-600" : "text-black"
      )}>
        {card.rank}
      </div>
      <div className={cn(
        "text-4xl",
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
  cashoutStatus,
  showCashoutAnimation,
  onAnimationEnd 
}: {
  playerNumber: 1 | 2;
  cards: Card[];
  equity: number;
  cashoutAmount: number;
  cashoutStatus: 'pending' | 'approved' | 'rejected' | null;
  showCashoutAnimation: boolean;
  onAnimationEnd: () => void;
}) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border-4 border-yellow-500 shadow-2xl">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold text-white mb-2">
          PLAYER {playerNumber}
        </h2>
        <div className="flex justify-center gap-4 mb-6">
          {cards.map((card, index) => (
            <CardDisplay key={index} card={card} />
          ))}
          {/* Empty slots for missing cards */}
          {Array.from({ length: Math.max(0, 2 - cards.length) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-gray-600 rounded-xl p-4 w-24 h-36 flex items-center justify-center border-2 border-gray-500"
            >
              <div className="text-gray-400 text-2xl">?</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Equity */}
        <div className="bg-blue-600 bg-opacity-30 rounded-2xl p-6 border-2 border-blue-400">
          <div className="text-center">
            <div className="text-2xl text-white mb-2 font-semibold">EQUITY</div>
            <div className="text-6xl font-bold text-blue-300">
              {equity.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Cashout Amount */}
        <div className="bg-green-600 bg-opacity-30 rounded-2xl p-6 border-2 border-green-400">
          <div className="text-center">
            <div className="text-2xl text-white mb-2 font-semibold">CASHOUT</div>
            <div className="text-5xl font-bold text-green-300">
              {formatCurrency(cashoutAmount)}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={cn(
          "rounded-2xl p-6 border-2 text-center",
          cashoutStatus === 'pending' && "bg-orange-600 bg-opacity-30 border-orange-400",
          cashoutStatus === 'approved' && "bg-green-600 bg-opacity-30 border-green-400",
          cashoutStatus === 'rejected' && "bg-red-600 bg-opacity-30 border-red-400",
          !cashoutStatus && "bg-gray-600 bg-opacity-30 border-gray-400"
        )}>
          <div className={cn(
            "text-3xl font-bold",
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

      {/* Cashout Animation */}
      <PlayerCashoutAnimation
        isVisible={showCashoutAnimation}
        cashoutAmount={cashoutAmount}
        onAnimationEnd={onAnimationEnd}
      />
    </div>
  );
}

export default function TVDisplay() {
  // Default/initial data
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

  const [showPlayer1Animation, setShowPlayer1Animation] = useState(false);
  const [showPlayer2Animation, setShowPlayer2Animation] = useState(false);
  const [prevPlayer1Status, setPrevPlayer1Status] = useState<string | null>(null);
  const [prevPlayer2Status, setPrevPlayer2Status] = useState<string | null>(null);

  // Subscribe to real-time updates
  useEffect(() => {
    console.log('TV Display: Component mounted, setting up subscription');
    console.log('TV Display: tvBroadcaster instance:', tvBroadcaster);
    
    // Create a stable subscription function
    const handleUpdate = (data: TVBroadcastData) => {
      console.log('TV Display: Received update:', data);
      setGameData(data);
    };
    
    // Subscribe with error handling
    let unsubscribe: (() => void) | null = null;
    try {
      console.log('TV Display: Attempting to subscribe...');
      unsubscribe = tvBroadcaster.subscribe(handleUpdate);
      console.log('TV Display: Successfully subscribed, unsubscribe function:', typeof unsubscribe);
    } catch (error) {
      console.error('TV Display: Failed to subscribe:', error);
    }
    
    // Test if there's existing data
    const existing = localStorage.getItem('poker-tv-broadcast');
    if (existing) {
      console.log('TV Display: Found existing data in localStorage:', existing);
      try {
        const parsedData = JSON.parse(existing);
        console.log('TV Display: Loading existing data:', parsedData);
        setGameData(parsedData);
      } catch (error) {
        console.error('TV Display: Failed to parse existing data:', error);
      }
    } else {
      console.log('TV Display: No existing data in localStorage');
    }
    
    // Cleanup function
    return () => {
      console.log('TV Display: Cleaning up subscription');
      if (unsubscribe) {
        try {
          unsubscribe();
          console.log('TV Display: Successfully unsubscribed');
        } catch (error) {
          console.error('TV Display: Error during cleanup:', error);
        }
      }
    };
  }, []);

  // Watch for cashout status changes to trigger animations
  useEffect(() => {
    if (gameData.player1CashoutStatus === 'approved' && prevPlayer1Status !== 'approved') {
      setShowPlayer1Animation(true);
    }
    setPrevPlayer1Status(gameData.player1CashoutStatus);
  }, [gameData.player1CashoutStatus, prevPlayer1Status]);

  useEffect(() => {
    if (gameData.player2CashoutStatus === 'approved' && prevPlayer2Status !== 'approved') {
      setShowPlayer2Animation(true);
    }
    setPrevPlayer2Status(gameData.player2CashoutStatus);
  }, [gameData.player2CashoutStatus, prevPlayer2Status]);
  
  const getGameVariantDisplay = (variant: GameVariant) => {
    switch (variant) {
      case 'nlh': return 'NO LIMIT HOLD\'EM';
      case 'plo4': return 'PLO4 (4-CARD OMAHA)';
      case 'plo5': return 'PLO5 (5-CARD OMAHA)';
      default: return variant.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-7xl font-bold text-white mb-4">
          <Spade className="inline text-yellow-500 mr-4" size={60} />
          POKER LIVE
          <Heart className="inline text-red-500 ml-4" size={60} />
        </h1>
        
        {/* Game Info Bar */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-2xl p-6 mb-8 border-4 border-yellow-400 shadow-2xl">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="text-black font-bold text-2xl mb-2 uppercase tracking-wide">
                GAME VARIANT
              </div>
              <div className="text-black font-bold text-4xl">
                {getGameVariantDisplay(gameData.gameVariant)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-black font-bold text-2xl mb-2 uppercase tracking-wide">
                POT AMOUNT
              </div>
              <div className="flex items-center justify-center">
                <DollarSign className="text-black mr-2" size={40} />
                <span className="text-black font-bold text-4xl">
                  {formatCurrency(gameData.potAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-12 max-w-7xl mx-auto">
        <PlayerSection
          playerNumber={1}
          cards={gameData.player1Cards}
          equity={gameData.player1Equity}
          cashoutAmount={gameData.player1CashoutAmount}
          cashoutStatus={gameData.player1CashoutStatus}
          showCashoutAnimation={showPlayer1Animation}
          onAnimationEnd={() => setShowPlayer1Animation(false)}
        />
        
        <PlayerSection
          playerNumber={2}
          cards={gameData.player2Cards}
          equity={gameData.player2Equity}
          cashoutAmount={gameData.player2CashoutAmount}
          cashoutStatus={gameData.player2CashoutStatus}
          showCashoutAnimation={showPlayer2Animation}
          onAnimationEnd={() => setShowPlayer2Animation(false)}
        />
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-gray-400">
        <p className="text-xl">LIVE EQUITY DISPLAY • REAL-TIME UPDATES</p>
      </div>
    </div>
  );
}
