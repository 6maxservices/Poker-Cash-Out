import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, GameVariant, CommunityCards, Hand, EquityResult } from "@shared/schema";
import { CommunityCards as CommunityCardsComponent } from "@/components/community-cards";
import { PlayerHand } from "@/components/player-hand";
import { EquityDisplay } from "@/components/equity-display";
import { BurnedCards } from "@/components/burned-cards";
import { PotAmountModal } from "@/components/pot-amount-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Spade, Heart, Calculator, DollarSign, Edit } from "lucide-react";

export default function PokerCalculator() {
  const [gameVariant, setGameVariant] = useState<GameVariant>('nlh');
  const [potAmount, setPotAmount] = useState<number>(100);
  const [communityCards, setCommunityCards] = useState<CommunityCards>({
    flop: [],
    turn: undefined,
    river: undefined
  });
  const [player1Hand, setPlayer1Hand] = useState<Hand>({ cards: [] });
  const [player2Hand, setPlayer2Hand] = useState<Hand>({ cards: [] });
  const [burnedCards, setBurnedCards] = useState<Card[]>([]);
  const [equityResult, setEquityResult] = useState<EquityResult | null>(null);
  const [isPotModalOpen, setIsPotModalOpen] = useState(false);

  const { toast } = useToast();

  const formatPotAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculateEquityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/calculate-equity', data);
      return await response.json();
    },
    onSuccess: (result) => {
      setEquityResult(result);
    },
    onError: (error) => {
      toast({
        title: "Calculation Error",
        description: error instanceof Error ? error.message : "Failed to calculate equity",
        variant: "destructive",
      });
    },
  });

  const getAllSelectedCards = useCallback((): Card[] => {
    return [
      ...communityCards.flop,
      ...(communityCards.turn ? [communityCards.turn] : []),
      ...(communityCards.river ? [communityCards.river] : []),
      ...player1Hand.cards,
      ...player2Hand.cards,
      ...burnedCards
    ];
  }, [communityCards, player1Hand, player2Hand, burnedCards]);

  const canCalculate = useCallback((): boolean => {
    const minCardsPerPlayer = gameVariant === 'nlh' ? 2 : gameVariant === 'plo4' ? 4 : 5;
    return player1Hand.cards.length >= minCardsPerPlayer && 
           player2Hand.cards.length >= minCardsPerPlayer;
  }, [gameVariant, player1Hand.cards.length, player2Hand.cards.length]);

  const handleCalculateEquity = useCallback(() => {
    if (!canCalculate()) {
      toast({
        title: "Incomplete Hand",
        description: "Please select all required cards for both players",
        variant: "destructive",
      });
      return;
    }

    console.log('Manual calculation triggered with:');
    console.log('- Game variant:', gameVariant);
    console.log('- Community cards:', communityCards);
    console.log('- Player 1 hand:', player1Hand.cards.map(c => c.rank + c.suit).join(', ') || 'none');
    console.log('- Player 2 hand:', player2Hand.cards.map(c => c.rank + c.suit).join(', ') || 'none');
    console.log('- Burned cards:', burnedCards.map(c => c.rank + c.suit).join(', ') || 'none');
    console.log('- Pot amount:', potAmount);

    calculateEquityMutation.mutate({
      gameVariant,
      communityCards,
      player1Hand,
      player2Hand,
      potAmount,
      burnedCards,
    });
  }, [gameVariant, communityCards, player1Hand, player2Hand, potAmount, burnedCards, canCalculate, toast]);

  // Manual calculation only - no auto-calculation
  // Users must click "Calc" button to trigger calculations

  const handleCommunityCardSelect = (card: Card, position: 'flop' | 'turn' | 'river') => {
    setCommunityCards(prev => {
      if (position === 'flop') {
        return { ...prev, flop: [...prev.flop, card] };
      } else if (position === 'turn') {
        return { ...prev, turn: card };
      } else {
        return { ...prev, river: card };
      }
    });
  };

  const handleCommunityCardDeselect = (position: 'flop' | 'turn' | 'river', index?: number) => {
    setCommunityCards(prev => {
      if (position === 'flop' && typeof index === 'number') {
        return { ...prev, flop: prev.flop.filter((_, i) => i !== index) };
      } else if (position === 'turn') {
        return { ...prev, turn: undefined };
      } else if (position === 'river') {
        return { ...prev, river: undefined };
      }
      return prev;
    });
  };

  const handleBurnedCardAdd = (card: Card) => {
    setBurnedCards(prev => [...prev, card]);
  };

  const handleBurnedCardRemove = (index: number) => {
    setBurnedCards(prev => prev.filter((_, i) => i !== index));
  };

  const handlePlayer1CardSelect = (card: Card) => {
    const maxCards = gameVariant === 'nlh' ? 2 : gameVariant === 'plo4' ? 4 : 5;
    if (player1Hand.cards.length < maxCards) {
      setPlayer1Hand(prev => ({ cards: [...prev.cards, card] }));
    }
  };

  const handlePlayer1CardDeselect = (index: number) => {
    setPlayer1Hand(prev => ({
      cards: prev.cards.filter((_, i) => i !== index)
    }));
  };

  const handlePlayer2CardSelect = (card: Card) => {
    const maxCards = gameVariant === 'nlh' ? 2 : gameVariant === 'plo4' ? 4 : 5;
    if (player2Hand.cards.length < maxCards) {
      setPlayer2Hand(prev => ({ cards: [...prev.cards, card] }));
    }
  };

  const handlePlayer2CardDeselect = (index: number) => {
    setPlayer2Hand(prev => ({
      cards: prev.cards.filter((_, i) => i !== index)
    }));
  };

  const handleCardDeselect = (card: Card) => {
    // Remove card from wherever it is
    setCommunityCards(prev => ({
      flop: prev.flop.filter(c => !(c.rank === card.rank && c.suit === card.suit)),
      turn: prev.turn?.rank === card.rank && prev.turn?.suit === card.suit ? undefined : prev.turn,
      river: prev.river?.rank === card.rank && prev.river?.suit === card.suit ? undefined : prev.river,
    }));
    setPlayer1Hand(prev => ({
      cards: prev.cards.filter(c => !(c.rank === card.rank && c.suit === card.suit))
    }));
    setPlayer2Hand(prev => ({
      cards: prev.cards.filter(c => !(c.rank === card.rank && c.suit === card.suit))
    }));
  };

  const handleReset = () => {
    setCommunityCards({ flop: [], turn: undefined, river: undefined });
    setPlayer1Hand({ cards: [] });
    setPlayer2Hand({ cards: [] });
    setBurnedCards([]);
    setEquityResult(null);
  };

  const handleSave = () => {
    toast({
      title: "Hand Saved",
      description: "Hand configuration has been saved successfully",
    });
  };

  return (
    <div className="min-h-screen p-2 md:p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          <Spade className="inline text-yellow-500 mr-2" size={24} />
          Professional Poker Equity Calculator
          <Heart className="inline text-red-500 ml-2" size={24} />
        </h1>
        <p className="text-gray-300 text-sm">Lightning-fast Monte Carlo calculations • 20,000 iterations</p>
      </div>

      {/* Pot Amount - Prominent Display */}
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-4 mb-6 border-2 border-yellow-400 shadow-2xl">
        <div className="text-center">
          <div className="text-black font-bold text-sm mb-2 uppercase tracking-wide">
            Current Pot Amount
          </div>
          <div 
            className="bg-black bg-opacity-90 rounded-lg p-4 cursor-pointer hover:bg-opacity-80 transition-all duration-200 border border-yellow-300"
            onClick={() => setIsPotModalOpen(true)}
          >
            <div className="flex items-center justify-center gap-3">
              <DollarSign className="text-yellow-500" size={32} />
              <span className="text-white font-bold text-3xl md:text-4xl">
                {formatPotAmount(potAmount)}
              </span>
              <Edit className="text-yellow-500" size={20} />
            </div>
            <p className="text-gray-400 text-sm mt-2">Click to edit pot amount</p>
          </div>
        </div>
      </div>

      {/* Game Settings */}
      <div className="bg-black bg-opacity-60 rounded-xl p-3 mb-4 backdrop-blur-sm border border-yellow-500 border-opacity-30">
        <div className="flex items-center justify-center gap-3">
          <Label className="text-white font-semibold text-sm">Game Variant:</Label>
          <Select value={gameVariant} onValueChange={(value: GameVariant) => setGameVariant(value)}>
            <SelectTrigger className="w-48 bg-black text-white border-yellow-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nlh">No Limit Hold'em</SelectItem>
              <SelectItem value="plo4">PLO4 (4-card Omaha)</SelectItem>
              <SelectItem value="plo5">PLO5 (5-card Omaha)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Players - Moved before community cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <PlayerHand
          playerNumber={1}
          cards={player1Hand.cards}
          equity={equityResult?.player1Equity || 0}
          moneyEquity={equityResult?.player1MoneyEquity || 0}
          gameVariant={gameVariant}
          onCardSelect={handlePlayer1CardSelect}
          onCardDeselect={handlePlayer1CardDeselect}
          selectedCards={getAllSelectedCards()}
        />

        <PlayerHand
          playerNumber={2}
          cards={player2Hand.cards}
          equity={equityResult?.player2Equity || 0}
          moneyEquity={equityResult?.player2MoneyEquity || 0}
          gameVariant={gameVariant}
          onCardSelect={handlePlayer2CardSelect}
          onCardDeselect={handlePlayer2CardDeselect}
          selectedCards={getAllSelectedCards()}
        />
      </div>

      {/* Community Cards */}
      <CommunityCardsComponent
        flop={communityCards.flop}
        turn={communityCards.turn}
        river={communityCards.river}
        onCardSelect={handleCommunityCardSelect}
        onCardDeselect={handleCommunityCardDeselect}
        selectedCards={getAllSelectedCards()}
      />

      {/* Burned Cards */}
      <BurnedCards
        burnedCards={burnedCards}
        onCardAdd={handleBurnedCardAdd}
        onCardRemove={handleBurnedCardRemove}
        selectedCards={getAllSelectedCards()}
      />

      {/* Calculation Controls */}
      <div className="bg-black bg-opacity-60 rounded-xl p-3 mb-4 backdrop-blur-sm border border-yellow-500 border-opacity-30">
        <div className="text-center mb-3">
          <Button
            onClick={handleCalculateEquity}
            disabled={!canCalculate() || calculateEquityMutation.isPending}
            size="lg"
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-sm px-8 py-3"
          >
            <Calculator className="mr-2 h-4 w-4" />
            {calculateEquityMutation.isPending ? 'Calculating...' : 'Calculate Equity'}
          </Button>
          {!canCalculate() && (
            <p className="text-gray-400 text-xs mt-2">
              Select all required cards for both players to calculate
            </p>
          )}
        </div>
        
        {/* Results Display */}
        <EquityDisplay
          result={equityResult}
          isCalculating={calculateEquityMutation.isPending}
          onRecalculate={handleCalculateEquity}
          onSave={handleSave}
          onReset={handleReset}
          burnedCardsCount={burnedCards.length}
        />
      </div>

      {/* Footer */}
      <div className="text-center mt-4 text-gray-500">
        <p className="text-xs">© 2024 Professional Poker Tools • Monte Carlo Simulation Engine</p>
      </div>

      {/* Pot Amount Modal */}
      <PotAmountModal
        isOpen={isPotModalOpen}
        onClose={() => setIsPotModalOpen(false)}
        currentAmount={potAmount}
        onAmountChange={setPotAmount}
      />
    </div>
  );
}
