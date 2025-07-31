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
import { setAppTheme } from "@/lib/theme-utils";
import { ThemeSelector } from "@/components/theme-selector";

export default function PokerCalculator() {
  const [gameVariant, setGameVariant] = useState<GameVariant>('nlh');
  const [potAmount, setPotAmount] = useState<number>(1000);
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

  // Set dealer theme on mount
  useEffect(() => {
    setAppTheme('dealer');
  }, []);

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

  // Auto-calculate equity whenever cards change
  useEffect(() => {
    if (canCalculate()) {
      console.log('Auto-calculating equity due to card changes...');
      calculateEquityMutation.mutate({
        gameVariant,
        communityCards,
        player1Hand,
        player2Hand,
        potAmount,
        burnedCards,
      });
    } else {
      // Send broadcast even when we can't calculate to update cards on TV
      try {
        tvApiClient.updateGameState({
          potAmount,
          gameVariant,
          handId,
          player1Equity: null,
          player2Equity: null,
          player1MoneyEquity: null,
          player2MoneyEquity: null,
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
        console.log('TV Broadcast sent for card update (no equity)');
      } catch (tvError) {
        console.error('Failed to broadcast card update to TV:', tvError);
      }
    }
  }, [gameVariant, communityCards, player1Hand.cards, player2Hand.cards, burnedCards, potAmount]);

  // Send TV broadcast whenever cashout status changes
  useEffect(() => {
    try {
      tvApiClient.updateGameState({
        potAmount,
        gameVariant,
        handId,
        player1Equity: equityResult?.player1Equity || null,
        player2Equity: equityResult?.player2Equity || null,
        player1MoneyEquity: equityResult?.player1MoneyEquity || null,
        player2MoneyEquity: equityResult?.player2MoneyEquity || null,
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
      console.log('TV Broadcast sent for cashout status update');
    } catch (tvError) {
      console.error('Failed to broadcast cashout status to TV:', tvError);
    }
  }, [player1CashoutStatus, player2CashoutStatus]);

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
    setPotAmount(1000); // Reset pot to default amount

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
              <Calculator className="h-8 w-8" />
              Poker Calculator
            </h1>
            <ThemeSelector />
          </div>
          
          {/* Pot Amount Display */}
          <div className="mt-4 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-4 shadow-lg">
            <div className="text-center cursor-pointer" onClick={() => setIsPotModalOpen(true)}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <DollarSign className="h-6 w-6 text-white" />
                <span className="text-white text-lg font-medium">POT AMOUNT</span>
              </div>
              <div className="text-4xl font-bold text-white">
                {formatPotAmount(potAmount)}
              </div>
              <p className="text-yellow-100 text-sm font-medium">Tap to edit pot amount</p>
            </div>
          </div>
        </div>

        {/* Game Settings */}
        <div className="mb-6 bg-black bg-opacity-40 rounded-xl p-4 backdrop-blur-sm border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="game-variant" className="text-sm font-medium text-gray-300 mb-2 block">
                Game Variant
              </Label>
              <Select value={gameVariant} onValueChange={(value: GameVariant) => setGameVariant(value)}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nlh">No Limit Hold'em</SelectItem>
                  <SelectItem value="plo4">PLO4</SelectItem>
                  <SelectItem value="plo5">PLO5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="service-fee" className="text-sm font-medium text-gray-300 mb-2 block">
                Service Fee
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="service-fee"
                  type="number"
                  value={feePercentage}
                  onChange={(e) => setFeePercentage(Number(e.target.value))}
                  className="bg-gray-800 border-gray-600 text-white"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleNewHand}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                New Hand
              </Button>
            </div>
          </div>
        </div>

        {/* TV Display Section */}
        <div className="mb-6 bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-200 mb-1">TV Display</h3>
              <p className="text-sm text-purple-300">Access Code: <span className="font-mono text-green-400">{tvAccessCode}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={tvConnectedClients > 0 ? "default" : "secondary"} className="bg-green-600">
                {tvConnectedClients} Connected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateTvCode}
                className="border-purple-500 text-purple-200 hover:bg-purple-800"
              >
                New Code
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/tv', '_blank')}
                className="border-purple-500 text-purple-200 hover:bg-purple-800"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open TV
              </Button>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Community Cards */}
          <div className="lg:col-span-2">
            <CommunityCardsComponent
              communityCards={communityCards}
              selectedCards={getAllSelectedCards()}
              onCardSelect={handleCommunityCardSelect}
              onCardDeselect={handleCommunityCardDeselect}
            />
          </div>

          {/* Burned Cards */}
          <div>
            <BurnedCards
              burnedCards={burnedCards}
              selectedCards={getAllSelectedCards()}
              onCardAdd={handleBurnedCardAdd}
              onCardRemove={handleBurnedCardRemove}
            />
          </div>
        </div>

        {/* Player Hands */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PlayerHand
            playerNumber={1}
            gameVariant={gameVariant}
            hand={player1Hand}
            selectedCards={getAllSelectedCards()}
            onCardSelect={handlePlayer1CardSelect}
            onCardDeselect={handlePlayer1CardDeselect}
            cashoutStatus={player1CashoutStatus}
            onCashoutStatusChange={handleCashoutStatusChange}
            equity={equityResult?.player1Equity}
            moneyEquity={equityResult?.player1MoneyEquity}
            resetTrigger={resetCashoutTrigger}
          />
          <PlayerHand
            playerNumber={2}
            gameVariant={gameVariant}
            hand={player2Hand}
            selectedCards={getAllSelectedCards()}
            onCardSelect={handlePlayer2CardSelect}
            onCardDeselect={handlePlayer2CardDeselect}
            cashoutStatus={player2CashoutStatus}
            onCashoutStatusChange={handleCashoutStatusChange}
            equity={equityResult?.player2Equity}
            moneyEquity={equityResult?.player2MoneyEquity}
            resetTrigger={resetCashoutTrigger}
          />
        </div>

        {/* Equity Display */}
        <EquityDisplay
          result={equityResult}
          isCalculating={calculateEquityMutation.isPending}
          onRecalculate={handleCalculateEquity}
          onSave={handleSave}
          onReset={handleReset}
          burnedCardsCount={burnedCards.length}
        />

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Button
            onClick={handleCalculateEquity}
            disabled={!canCalculate() || calculateEquityMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {calculateEquityMutation.isPending ? 'Calculating...' : 'Calculate'}
          </Button>
          
          <Button
            onClick={handleFinishHand}
            disabled={!canFinishHand()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
          >
            Finish Hand
          </Button>
          
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800 px-6 py-2"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Pot Amount Modal */}
        <PotAmountModal
          isOpen={isPotModalOpen}
          onClose={() => setIsPotModalOpen(false)}
          currentAmount={potAmount}
          onAmountChange={setPotAmount}
        />
      </div>
    </div>
  );
}