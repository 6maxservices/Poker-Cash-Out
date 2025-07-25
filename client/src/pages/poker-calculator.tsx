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
import { cn } from "@/lib/utils";
import { Spade, Heart, DollarSign, Calculator, Monitor, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { tvApiClient } from "@/lib/tv-api";

export default function PokerCalculator() {
  const [gameVariant, setGameVariant] = useState<GameVariant>('nlh');
  const [potAmount, setPotAmount] = useState<number>(100);
  const [feePercentage, setFeePercentage] = useState<number>(5);
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
  const [handId, setHandId] = useState<string | null>(null);
  const [player1CashoutStatus, setPlayer1CashoutStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [player2CashoutStatus, setPlayer2CashoutStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [resetCashoutTrigger, setResetCashoutTrigger] = useState(false);

  const { toast } = useToast();

  const [tvAccessCode, setTvAccessCode] = useState<string>("");
  const [tvConnectedClients, setTvConnectedClients] = useState<number>(0);

  useEffect(() => {
    // Fetch initial access code from server
    fetch('/api/tv/access-code')
      .then(res => res.json())
      .then(data => {
        setTvAccessCode(data.accessCode);
        setTvConnectedClients(data.connectedClients);
      })
      .catch(error => console.error('Failed to fetch TV access code:', error));
  }, []);

  const regenerateTvCode = async () => {
    try {
      const response = await fetch('/api/tv/regenerate-code', { method: 'POST' });
      const data = await response.json();
      setTvAccessCode(data.accessCode);
    } catch (error) {
      console.error('Failed to regenerate TV access code:', error);
    }
  };

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
      // Broadcast to TV displays
      try {
        tvApiClient.updateGameState({
          potAmount,
          gameVariant,
          handId,
          player1Equity: result.player1Equity,
          player2Equity: result.player2Equity,
          player1MoneyEquity: result.player1MoneyEquity,
          player2MoneyEquity: result.player2MoneyEquity,
          player1Hand: player1Hand.cards,
          player2Hand: player2Hand.cards,
          player1CashoutStatus: player1CashoutStatus,
          player2CashoutStatus: player2CashoutStatus,
          communityCards: {
            flop: communityCards.flop,
            turn: communityCards.turn,
            river: communityCards.river,
          }
        });
        console.log('TV Broadcast sent successfully:');
      } catch (tvError) {
        console.error('Failed to broadcast to TV:', tvError);
      }
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
  }, [gameVariant, communityCards, player1Hand, player2Hand, potAmount, burnedCards, canCalculate, toast, calculateEquityMutation]);

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

  const hasApprovedCashout = (): boolean => {
    return player1CashoutStatus === 'approved' || player2CashoutStatus === 'approved';
  };

  const handleCashoutStatusChange = (playerNumber: 1 | 2, status: 'pending' | 'approved' | 'rejected' | null) => {
    if (playerNumber === 1) {
      setPlayer1CashoutStatus(status);
    } else {
      setPlayer2CashoutStatus(status);
    }
  };

  const areAllCommunityCardsFilled = (): boolean => {
    return communityCards.flop.length === 3 && 
           communityCards.turn !== undefined && 
           communityCards.river !== undefined;
  };

  const canFinishHand = (): boolean => {
    const hasApproved = hasApprovedCashout();
    const allCardsFilled = areAllCommunityCardsFilled();

    if (hasApproved && !allCardsFilled) {
      return false; // Cannot finish if cashout approved but cards not filled
    }

    return player1Hand.cards.length > 0 || player2Hand.cards.length > 0 || 
           communityCards.flop.length > 0 || burnedCards.length > 0;
  };

  const handleNewHand = () => {
    setCommunityCards({ flop: [], turn: undefined, river: undefined });
    setPlayer1Hand({ cards: [] });
    setPlayer2Hand({ cards: [] });
    setBurnedCards([]);
    setEquityResult(null);
    setPlayer1CashoutStatus(null);
    setPlayer2CashoutStatus(null);
    setHandId(`hand_${Date.now()}`);
    setPotAmount(100); // Reset pot to default amount

    // Trigger reset for player components
    setResetCashoutTrigger(true);
    setTimeout(() => setResetCashoutTrigger(false), 100);

    toast({
      title: "New Hand Started",
      description: "Ready to deal a new hand with fresh pot",
    });
  };

  const handleFinishHand = () => {
    if (!canFinishHand()) {
      if (hasApprovedCashout() && !areAllCommunityCardsFilled()) {
        toast({
          title: "Cannot Finish Hand",
          description: "All 5 community cards must be filled when a cashout is approved",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Cannot Finish Hand",
        description: "No cards have been dealt in this hand",
        variant: "destructive",
      });
      return;
    }

    // Calculate final equity if not already done
    if (!equityResult && canCalculate()) {
      handleCalculateEquity();
    }

    // Save hand to database/storage
    const handData = {
      handId: handId || `hand_${Date.now()}`,
      gameVariant,
      potAmount,
      feePercentage,
      communityCards,
      player1Hand,
      player2Hand,
      burnedCards,
      equityResult,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    console.log('Saving completed hand:', handData);

    toast({
      title: "Hand Finished & Saved",
      description: "Hand has been completed and saved to records",
    });

    // Reset for next hand
    handleNewHand();
  };

  const handleSave = () => {
    if (!equityResult) {
      toast({
        title: "No Results to Save",
        description: "Calculate equity first before saving",
        variant: "destructive",
      });
      return;
    }

    const handData = {
      handId: handId || `hand_${Date.now()}`,
      gameVariant,
      potAmount,
      feePercentage,
      communityCards,
      player1Hand,
      player2Hand,
      burnedCards,
      equityResult,
      timestamp: new Date().toISOString(),
      status: 'saved'
    };

    console.log('Saving hand data:', handData);

    toast({
      title: "Hand Saved",
      description: "Hand data has been saved successfully",
    });
  };

  const handleReset = () => {
    setCommunityCards({ flop: [], turn: undefined, river: undefined });
    setPlayer1Hand({ cards: [] });
    setPlayer2Hand({ cards: [] });
    setBurnedCards([]);
    setEquityResult(null);
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
            </div>
            <p className="text-gray-400 text-sm mt-2">Click to edit pot amount</p>
          </div>
        </div>
      </div>

      {/* Game Settings */}
      <div className="bg-black bg-opacity-60 rounded-xl p-3 mb-4 backdrop-blur-sm border border-yellow-500 border-opacity-30">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2">
            <Label className="text-white font-semibold text-sm">Service Fee:</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={feePercentage}
                onChange={(e) => setFeePercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                min="0"
                max="100"
                step="0.1"
                className="w-20 bg-black text-white border-yellow-500 text-center"
              />
              <span className="text-white font-semibold text-sm">%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
          {/* TV Broadcast Panel */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-4 border border-blue-700/50">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center space-x-3">
                <Monitor className="h-6 w-6 text-blue-400" />
                <div>
                  <h3 className="text-white font-semibold">TV Display</h3>
                  <p className="text-gray-300 text-sm">Access Code: <span className="font-mono font-bold text-blue-400">{tvAccessCode}</span></p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Badge variant={tvConnectedClients > 0 ? "default" : "secondary"} className="bg-green-600/20 border-green-600 text-green-400">
                  {tvConnectedClients} Connected
                </Badge>
                <Button size="sm" variant="outline" onClick={regenerateTvCode}>
                  New Code
                </Button>
                <Button size="sm" onClick={() => window.open('/tv', '_blank')} className="bg-blue-600 hover:bg-blue-700">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open TV
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            </div>
          </div>
        </div>

      {/* Players - Moved before community cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <PlayerHand
          playerNumber={1}
          cards={player1Hand.cards}
          equity={equityResult?.player1Equity || 0}
          moneyEquity={equityResult?.player1MoneyEquity || 0}
          feePercentage={feePercentage}
          gameVariant={gameVariant}
          onCardSelect={handlePlayer1CardSelect}
          onCardDeselect={handlePlayer1CardDeselect}
          selectedCards={getAllSelectedCards()}
          onCashoutStatusChange={handleCashoutStatusChange}
          resetCashoutStatus={resetCashoutTrigger}
        />

        <PlayerHand
          playerNumber={2}
          cards={player2Hand.cards}
          equity={equityResult?.player2Equity || 0}
          moneyEquity={equityResult?.player2MoneyEquity || 0}
          feePercentage={feePercentage}
          gameVariant={gameVariant}
          onCardSelect={handlePlayer2CardSelect}
          onCardDeselect={handlePlayer2CardDeselect}
          selectedCards={getAllSelectedCards()}
          onCashoutStatusChange={handleCashoutStatusChange}
          resetCashoutStatus={resetCashoutTrigger}
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

      {/* Hand Management Controls */}
      <div className="bg-black bg-opacity-60 rounded-xl p-4 mb-4 backdrop-blur-sm border border-red-500 border-opacity-50">
        <h3 className="text-white font-bold text-lg mb-3 text-center">
          <span className="text-red-500 mr-2">🎰</span>
          Dealer Controls
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={handleNewHand}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-4"
          >
            New Hand
          </Button>

          <Button
            onClick={handleFinishHand}
            disabled={!canFinishHand()}
            size="lg"
            className={cn(
              "font-bold text-base py-4",
              canFinishHand() 
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            )}
          >
            Finish & Save Hand
          </Button>
        </div>

        {hasApprovedCashout() && !areAllCommunityCardsFilled() && (
          <div className="mt-3 p-3 bg-orange-600 bg-opacity-20 border border-orange-500 rounded-lg">
            <div className="text-orange-400 font-semibold text-sm text-center">
              ⚠️ CASHOUT APPROVED - All 5 community cards must be filled before finishing hand
            </div>
          </div>
        )}

        {handId && (
          <div className="mt-2 text-center text-gray-400 text-xs">
            Current Hand ID: {handId}
          </div>
        )}
      </div>

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