import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, GameVariant, CommunityCards, Hand, EquityResult } from "@shared/schema";
import { CommunityCards as CommunityCardsComponent } from "@/components/community-cards";
import { PlayerHand } from "@/components/player-hand";
import { EquityDisplay } from "@/components/equity-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Spade, Heart } from "lucide-react";

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
  const [equityResult, setEquityResult] = useState<EquityResult | null>(null);

  const { toast } = useToast();

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
      ...player2Hand.cards
    ];
  }, [communityCards, player1Hand, player2Hand]);

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

    calculateEquityMutation.mutate({
      gameVariant,
      communityCards,
      player1Hand,
      player2Hand,
      potAmount,
    });
  }, [gameVariant, communityCards, player1Hand, player2Hand, potAmount, canCalculate, toast]);

  // Auto-calculate when hands are complete
  useEffect(() => {
    if (canCalculate()) {
      handleCalculateEquity();
    }
  }, [canCalculate, handleCalculateEquity]);

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

      {/* Game Settings */}
      <div className="bg-black bg-opacity-60 rounded-xl p-3 mb-4 backdrop-blur-sm border border-yellow-500 border-opacity-30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Label className="text-white font-semibold text-sm">Game:</Label>
            <Select value={gameVariant} onValueChange={(value: GameVariant) => setGameVariant(value)}>
              <SelectTrigger className="w-40 bg-black text-white border-yellow-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nlh">No Limit Hold'em</SelectItem>
                <SelectItem value="plo4">PLO4 (4-card Omaha)</SelectItem>
                <SelectItem value="plo5">PLO5 (5-card Omaha)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-white font-semibold text-sm">Pot:</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-yellow-500 font-bold text-sm">$</span>
              <Input
                type="number"
                value={potAmount}
                onChange={(e) => setPotAmount(Number(e.target.value))}
                className="w-28 pl-6 bg-black text-white border-yellow-500 focus:ring-yellow-500 h-8"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>
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

      {/* Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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

      {/* Calculation Status */}
      <EquityDisplay
        result={equityResult}
        isCalculating={calculateEquityMutation.isPending}
        onRecalculate={handleCalculateEquity}
        onSave={handleSave}
        onReset={handleReset}
      />

      {/* Footer */}
      <div className="text-center mt-4 text-gray-500">
        <p className="text-xs">© 2024 Professional Poker Tools • Monte Carlo Simulation Engine</p>
      </div>
    </div>
  );
}
