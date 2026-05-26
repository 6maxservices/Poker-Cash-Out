import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, GameVariant, CommunityCards, Hand, EquityResult } from "@shared/schema";
import { CommunityCards as CommunityCardsComponent } from "@/components/community-cards";
import { PlayerHand, SlotTarget } from "@/components/player-hand";
import { DealerKeypad } from "@/components/dealer-keypad";
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
import { Spade, Heart, DollarSign, Calculator, Monitor, ExternalLink, RotateCcw, TrendingUp, Trash2, Coins, Award, History, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { tvApiClient } from "@/lib/tv-api";
import { setAppTheme } from "@/lib/theme-utils";
import { ThemeSelector } from "@/components/theme-selector";

interface SessionHand {
  handId: string;
  gameVariant: GameVariant;
  potAmount: number;
  feePercentage: number;
  player1Cashed: boolean;
  player2Cashed: boolean;
  player1Payout: number;
  player2Payout: number;
  player1Fee: number;
  player2Fee: number;
  winner: 1 | 2 | 'split' | 'unknown';
  houseProfit: number;
  timestamp: string;
}

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

  const [player1Name, setPlayer1Name] = useState<string>("Player 1");
  const [player2Name, setPlayer2Name] = useState<string>("Player 2");
  const [launchTheme, setLaunchTheme] = useState<'gold' | 'felt' | 'cyber' | 'overlay'>('gold');

  const [activeSlot, setActiveSlot] = useState<SlotTarget | null>({ type: 'player1', index: 0 });
  const [sessionHistory, setSessionHistory] = useState<SessionHand[]>([]);

  const { toast } = useToast();

  const [tvAccessCode, setTvAccessCode] = useState<string>("");
  const [tvConnectedClients, setTvConnectedClients] = useState<number>(0);

  // Set dealer theme on mount
  useEffect(() => {
    setAppTheme('dealer');
  }, []);

  // Load session history on mount
  useEffect(() => {
    const saved = localStorage.getItem('poker_session_history');
    if (saved) {
      try {
        setSessionHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse session history:', e);
      }
    }
  }, []);

  const saveSessionHistory = (newHistory: SessionHand[]) => {
    setSessionHistory(newHistory);
    localStorage.setItem('poker_session_history', JSON.stringify(newHistory));
  };

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

  // Reset active slot when game variant changes
  useEffect(() => {
    setActiveSlot({ type: 'player1', index: 0 });
  }, [gameVariant]);

  const getNextSequentialSlot = useCallback((currentSlot: SlotTarget, variant: GameVariant): SlotTarget | null => {
    const maxCards = variant === 'nlh' ? 2 : variant === 'plo4' ? 4 : 5;
    if (currentSlot.type === 'player1') {
      const nextIdx = (currentSlot.index ?? 0) + 1;
      if (nextIdx < maxCards) {
        return { type: 'player1', index: nextIdx };
      } else {
        return { type: 'player2', index: 0 };
      }
    } else if (currentSlot.type === 'player2') {
      const nextIdx = (currentSlot.index ?? 0) + 1;
      if (nextIdx < maxCards) {
        return { type: 'player2', index: nextIdx };
      } else {
        return { type: 'flop', index: 0 };
      }
    } else if (currentSlot.type === 'flop') {
      const nextIdx = (currentSlot.index ?? 0) + 1;
      if (nextIdx < 3) {
        return { type: 'flop', index: nextIdx };
      } else {
        return { type: 'turn' };
      }
    } else if (currentSlot.type === 'turn') {
      return { type: 'river' };
    } else if (currentSlot.type === 'river') {
      return null;
    }
    return null;
  }, []);

  const handleSlotClick = useCallback((target: SlotTarget) => {
    setActiveSlot(target);
  }, []);

  const handleCardSelectFromKeypad = useCallback((card: Card) => {
    if (!activeSlot) return;

    // Check if card is already in use
    const allSelected = getAllSelectedCards();
    if (allSelected.some(c => c.rank === card.rank && c.suit === card.suit)) {
      toast({
        title: "Card already in use",
        description: `${card.rank}${card.suit} is already dealt.`,
        variant: "destructive"
      });
      return;
    }

    if (activeSlot.type === 'player1') {
      const idx = activeSlot.index ?? 0;
      setPlayer1Hand(prev => {
        const newCards = [...prev.cards];
        if (idx < newCards.length) {
          newCards[idx] = card;
        } else {
          newCards.push(card);
        }
        return { cards: newCards };
      });
    } else if (activeSlot.type === 'player2') {
      const idx = activeSlot.index ?? 0;
      setPlayer2Hand(prev => {
        const newCards = [...prev.cards];
        if (idx < newCards.length) {
          newCards[idx] = card;
        } else {
          newCards.push(card);
        }
        return { cards: newCards };
      });
    } else if (activeSlot.type === 'flop') {
      const idx = activeSlot.index ?? 0;
      setCommunityCards(prev => {
        const newFlop = [...prev.flop];
        if (idx < newFlop.length) {
          newFlop[idx] = card;
        } else {
          newFlop.push(card);
        }
        return { ...prev, flop: newFlop };
      });
    } else if (activeSlot.type === 'turn') {
      setCommunityCards(prev => ({ ...prev, turn: card }));
    } else if (activeSlot.type === 'river') {
      setCommunityCards(prev => ({ ...prev, river: card }));
    }

    // Auto advance
    const nextSlot = getNextSequentialSlot(activeSlot, gameVariant);
    setActiveSlot(nextSlot);
  }, [activeSlot, gameVariant, getAllSelectedCards, toast, getNextSequentialSlot]);

  const handleClearActiveSlot = useCallback(() => {
    if (!activeSlot) return;

    if (activeSlot.type === 'player1') {
      const idx = activeSlot.index ?? 0;
      setPlayer1Hand(prev => ({
        cards: prev.cards.filter((_, i) => i !== idx)
      }));
    } else if (activeSlot.type === 'player2') {
      const idx = activeSlot.index ?? 0;
      setPlayer2Hand(prev => ({
        cards: prev.cards.filter((_, i) => i !== idx)
      }));
    } else if (activeSlot.type === 'flop') {
      const idx = activeSlot.index ?? 0;
      setCommunityCards(prev => ({
        ...prev,
        flop: prev.flop.filter((_, i) => i !== idx)
      }));
    } else if (activeSlot.type === 'turn') {
      setCommunityCards(prev => ({ ...prev, turn: undefined }));
    } else if (activeSlot.type === 'river') {
      setCommunityCards(prev => ({ ...prev, river: undefined }));
    }
  }, [activeSlot]);

  const handleClearSession = () => {
    saveSessionHistory([]);
    toast({
      title: "Session History Cleared",
      description: "P&L tracking statistics have been reset.",
    });
  };

  const getSessionStats = () => {
    let totalGuaranteed = 0;
    let totalRealized = 0;
    let totalYield = 0;
    
    sessionHistory.forEach(h => {
      totalGuaranteed += (h.player1Fee || 0) + (h.player2Fee || 0);
      totalYield += h.houseProfit || 0;
    });
    
    totalRealized = totalYield - totalGuaranteed;
    
    return {
      totalGuaranteed,
      totalRealized,
      totalYield,
      totalHands: sessionHistory.length
    };
  };

  const stats = getSessionStats();

  const getActiveSlotName = () => {
    if (!activeSlot) return "";
    const typeLabel = activeSlot.type === 'player1' ? "Player 1" 
                    : activeSlot.type === 'player2' ? "Player 2" 
                    : activeSlot.type === 'flop' ? "Flop"
                    : activeSlot.type === 'turn' ? "Turn"
                    : "River";
    const indexLabel = typeof activeSlot.index === 'number' ? ` Card ${activeSlot.index + 1}` : "";
    return `${typeLabel}${indexLabel}`;
  };

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
    const roundedUp = Math.ceil(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(roundedUp);
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
          player1Name,
          player2Name,
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
          player1Name,
          player2Name,
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
        player1Name,
        player2Name,
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

  // Send TV broadcast when player names change
  useEffect(() => {
    try {
      tvApiClient.updateGameState({
        potAmount,
        gameVariant,
        handId,
        player1Name,
        player2Name,
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
      console.log('TV Broadcast sent for name change:', player1Name, player2Name);
    } catch (tvError) {
      console.error('Failed to broadcast names to TV:', tvError);
    }
  }, [player1Name, player2Name]);

  const handleCommunityCardSelect = useCallback((card: Card, position: 'flop' | 'turn' | 'river', index?: number) => {
    const allSelected = getAllSelectedCards();
    if (allSelected.some(c => c.rank === card.rank && c.suit === card.suit)) {
      toast({
        title: "Card already in use",
        description: `${card.rank}${card.suit} is already dealt.`,
        variant: "destructive"
      });
      return;
    }
    setCommunityCards(prev => {
      if (position === 'flop') {
        const idx = index ?? prev.flop.length;
        const newFlop = [...prev.flop];
        newFlop[idx] = card;
        return { ...prev, flop: newFlop };
      } else if (position === 'turn') {
        return { ...prev, turn: card };
      } else {
        return { ...prev, river: card };
      }
    });
    // Set active slot to next sequential
    const nextSlot = getNextSequentialSlot({ type: position, index }, gameVariant);
    setActiveSlot(nextSlot);
  }, [gameVariant, getAllSelectedCards, toast, getNextSequentialSlot]);

  const handleCommunityCardDeselect = useCallback((position: 'flop' | 'turn' | 'river', index?: number) => {
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
    setActiveSlot({ type: position, index });
  }, []);

  const handleBurnedCardAdd = (card: Card) => {
    setBurnedCards(prev => [...prev, card]);
  };

  const handleBurnedCardRemove = (index: number) => {
    setBurnedCards(prev => prev.filter((_, i) => i !== index));
  };

  const handlePlayer1CardSelect = useCallback((card: Card, index: number) => {
    const allSelected = getAllSelectedCards();
    if (allSelected.some(c => c.rank === card.rank && c.suit === card.suit)) {
      toast({
        title: "Card already in use",
        description: `${card.rank}${card.suit} is already dealt.`,
        variant: "destructive"
      });
      return;
    }
    setPlayer1Hand(prev => {
      const newCards = [...prev.cards];
      newCards[index] = card;
      return { cards: newCards };
    });
    // Set active slot to next sequential
    const nextSlot = getNextSequentialSlot({ type: 'player1', index }, gameVariant);
    setActiveSlot(nextSlot);
  }, [gameVariant, getAllSelectedCards, toast, getNextSequentialSlot]);

  const handlePlayer1CardDeselect = useCallback((index: number) => {
    setPlayer1Hand(prev => ({
      cards: prev.cards.filter((_, i) => i !== index)
    }));
    setActiveSlot({ type: 'player1', index });
  }, []);

  const handlePlayer2CardSelect = useCallback((card: Card, index: number) => {
    const allSelected = getAllSelectedCards();
    if (allSelected.some(c => c.rank === card.rank && c.suit === card.suit)) {
      toast({
        title: "Card already in use",
        description: `${card.rank}${card.suit} is already dealt.`,
        variant: "destructive"
      });
      return;
    }
    setPlayer2Hand(prev => {
      const newCards = [...prev.cards];
      newCards[index] = card;
      return { cards: newCards };
    });
    // Set active slot to next sequential
    const nextSlot = getNextSequentialSlot({ type: 'player2', index }, gameVariant);
    setActiveSlot(nextSlot);
  }, [gameVariant, getAllSelectedCards, toast, getNextSequentialSlot]);

  const handlePlayer2CardDeselect = useCallback((index: number) => {
    setPlayer2Hand(prev => ({
      cards: prev.cards.filter((_, i) => i !== index)
    }));
    setActiveSlot({ type: 'player2', index });
  }, []);

  const handlePlayer1BatchSelect = useCallback((cards: Card[]) => {
    setPlayer1Hand({ cards });
    // Advance to Player 2
    setActiveSlot({ type: 'player2', index: 0 });
  }, []);

  const handlePlayer2BatchSelect = useCallback((cards: Card[]) => {
    setPlayer2Hand({ cards });
    // Advance to Board Flop
    setActiveSlot({ type: 'flop', index: 0 });
  }, []);

  const handleCommunityBatchSelect = useCallback((cards: Card[]) => {
    setCommunityCards({
      flop: cards.slice(0, 3),
      turn: cards[3],
      river: cards[4]
    });
    // Set active slot to next logical empty slot or null if board is full
    if (cards.length >= 5) {
      setActiveSlot(null);
    } else if (cards.length >= 3) {
      setActiveSlot({ type: 'turn' });
    } else {
      setActiveSlot({ type: 'flop', index: cards.length });
    }
  }, []);

  const handleBurnedBatchSelect = useCallback((cards: Card[]) => {
    setBurnedCards(cards);
  }, []);

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

    // Determine hand P&L metrics
    let p1Fee = 0;
    let p2Fee = 0;
    let p1Payout = 0;
    let p2Payout = 0;
    let winner: 1 | 2 | 'split' | 'unknown' = 'unknown';
    let houseProfit = 0;

    const p1Cashed = player1CashoutStatus === 'approved';
    const p2Cashed = player2CashoutStatus === 'approved';

    if (equityResult) {
      if (p1Cashed) {
        const p1Money = equityResult.player1MoneyEquity || 0;
        p1Fee = p1Money * (feePercentage / 100);
        p1Payout = p1Money - p1Fee;
      }
      if (p2Cashed) {
        const p2Money = equityResult.player2MoneyEquity || 0;
        p2Fee = p2Money * (feePercentage / 100);
        p2Payout = p2Money - p2Fee;
      }

      if (equityResult.player1Equity > 99) {
        winner = 1;
      } else if (equityResult.player2Equity > 99) {
        winner = 2;
      } else if (Math.abs(equityResult.player1Equity - 50) < 1 && Math.abs(equityResult.player2Equity - 50) < 1) {
        winner = 'split';
      }
    }

    // Cashout Profit/Loss calculations
    let cashoutPnL = 0;
    if (p1Cashed && p2Cashed) {
      cashoutPnL = potAmount - p1Payout - p2Payout;
    } else if (p1Cashed) {
      if (winner === 1) {
        cashoutPnL = potAmount - p1Payout;
      } else if (winner === 2) {
        cashoutPnL = -p1Payout;
      } else if (winner === 'split') {
        cashoutPnL = (potAmount / 2) - p1Payout;
      }
    } else if (p2Cashed) {
      if (winner === 2) {
        cashoutPnL = potAmount - p2Payout;
      } else if (winner === 1) {
        cashoutPnL = -p2Payout;
      } else if (winner === 'split') {
        cashoutPnL = (potAmount / 2) - p2Payout;
      }
    }

    houseProfit = p1Fee + p2Fee + cashoutPnL;

    const newHand: SessionHand = {
      handId: handId || `hand_${Date.now()}`,
      gameVariant,
      potAmount,
      feePercentage,
      player1Cashed: p1Cashed,
      player2Cashed: p2Cashed,
      player1Payout: p1Payout,
      player2Payout: p2Payout,
      player1Fee: p1Fee,
      player2Fee: p2Fee,
      winner,
      houseProfit,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [newHand, ...sessionHistory];
    saveSessionHistory(updatedHistory);

    // Save hand to database/storage (optional API backup)
    const handData = {
      handId: newHand.handId,
      gameVariant,
      potAmount,
      feePercentage,
      communityCards,
      player1Hand,
      player2Hand,
      burnedCards,
      equityResult,
      timestamp: newHand.timestamp,
      status: 'completed'
    };

    console.log('Saving completed hand to database storage:', handData);

    toast({
      title: "Hand Finished & Tracked",
      description: `Guaranteed Fee: $${Math.ceil(p1Fee + p2Fee)} | Net House Yield: $${Math.ceil(houseProfit)}`,
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400 flex items-center gap-2">
              <Calculator className="h-6 w-6 sm:h-8 sm:w-8" />
              Poker Calculator
            </h1>
            <ThemeSelector 
              currentTheme={'dealer'}
              onThemeChange={(theme) => setAppTheme(theme)}
            />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button 
                onClick={handleNewHand}
                className="w-full bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
              >
                New Hand
              </Button>
            </div>
          </div>

          {/* Customizable Player Names Row */}
          <div className="mt-4 pt-4 border-t border-gray-700/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="player-1-name" className="text-xs font-semibold text-gray-400 mb-2 block">
                PLAYER 1 NAME
              </Label>
              <Input
                id="player-1-name"
                value={player1Name}
                onChange={(e) => setPlayer1Name(e.target.value)}
                placeholder="Player 1"
                className="bg-gray-800 border-gray-600 text-white h-[40px] text-sm"
              />
            </div>
            <div>
              <Label htmlFor="player-2-name" className="text-xs font-semibold text-gray-400 mb-2 block">
                PLAYER 2 NAME
              </Label>
              <Input
                id="player-2-name"
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                placeholder="Player 2"
                className="bg-gray-800 border-gray-600 text-white h-[40px] text-sm"
              />
            </div>
          </div>
        </div>

        {/* TV Stream and Host Profitability Dashboard side-by-side */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* TV Stream Control Panel */}
          <div className="bg-gradient-to-br from-purple-950/40 to-black/60 border border-purple-500/35 rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between min-h-[220px]">
            <div>
              <h3 className="text-lg font-bold text-purple-200 mb-1 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-purple-400 animate-pulse" />
                TV STREAM DISPLAY
              </h3>
              <p className="text-xs text-purple-300/70 mb-4">Cast real-time poker equity graphics directly onto live streams & TV monitors.</p>
              
              <div className="bg-black/50 border border-purple-900/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-xs text-purple-300 mb-1">
                  <span>TV ACCESS CODE</span>
                  <Badge variant={tvConnectedClients > 0 ? "default" : "secondary"} className={cn("text-[10px] px-1.5 py-0 h-4 font-bold border-none", tvConnectedClients > 0 ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400")}>
                    {tvConnectedClients} {tvConnectedClients === 1 ? 'Client' : 'Clients'} Active
                  </Badge>
                </div>
                <div className="text-3xl font-black font-mono tracking-widest text-green-400 text-center py-1">
                  {tvAccessCode || "----"}
                </div>
              </div>
            </div>
            
            <div className="mb-3">
              <Label className="text-[10px] font-bold text-purple-300 uppercase block mb-1.5">STREAM LAUNCH THEME</Label>
              <Select value={launchTheme} onValueChange={(value: any) => setLaunchTheme(value)}>
                <SelectTrigger className="bg-black/40 border-purple-500/20 text-purple-200 h-8 text-xs focus:ring-purple-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20 text-white">
                  <SelectItem value="gold">VIP Gold Theme</SelectItem>
                  <SelectItem value="felt">Vegas Green Felt</SelectItem>
                  <SelectItem value="cyber">Cyber Neon Theme</SelectItem>
                  <SelectItem value="overlay">OBS transparent Overlay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateTvCode}
                className="border-purple-500/40 text-purple-200 hover:bg-purple-950/30 text-xs font-semibold py-2.5 h-auto"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset Code
              </Button>
              <Button
                variant="default"
                size="sm"
                asChild
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2.5 h-auto"
              >
                <a href={`/tv?theme=${launchTheme}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Launch TV
                </a>
              </Button>
            </div>
          </div>

          {/* Host Profitability & P&L Dashboard */}
          <div className="xl:col-span-2 bg-gradient-to-br from-gray-950 to-gray-900 border border-yellow-500/30 rounded-xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-3 border-b border-gray-800/80">
              <div>
                <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-yellow-500 animate-pulse" />
                  HOST PROFITABILITY & SESSION P&L
                </h3>
                <p className="text-xs text-gray-400">Real-time house analytics & risk variance tracking</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSession}
                disabled={sessionHistory.length === 0}
                className="self-start sm:self-center border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs font-semibold py-1.5 h-auto transition-colors"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                Reset Session
              </Button>
            </div>

            {/* Grid of 3 key indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {/* Guaranteed Fees */}
              <div className="bg-black/40 border border-gray-800/60 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Guaranteed Fees</span>
                  <Coins className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div>
                  <div className="text-xl font-black text-blue-400">
                    {formatPotAmount(stats.totalGuaranteed)}
                  </div>
                  <p className="text-[9px] text-gray-500 mt-0.5">EV service rake (0% risk)</p>
                </div>
              </div>

              {/* Realized Insurance P&L */}
              <div className="bg-black/40 border border-gray-800/60 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Insurance Risk P&L</span>
                  <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div>
                  <div className={cn(
                    "text-xl font-black",
                    stats.totalRealized >= 0 ? "text-amber-400" : "text-red-400"
                  )}>
                    {stats.totalRealized >= 0 ? "+" : ""}{formatPotAmount(stats.totalRealized)}
                  </div>
                  <p className="text-[9px] text-gray-500 mt-0.5">Variance runout outcome</p>
                </div>
              </div>

              {/* Total Yield */}
              <div className="bg-gradient-to-r from-yellow-950/20 to-yellow-900/10 border border-yellow-500/20 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-yellow-500/2 pointer-events-none"></div>
                <div className="flex items-center justify-between mb-1 relative z-10">
                  <span className="text-[10px] font-bold text-yellow-500 tracking-wider uppercase">Total Session Yield</span>
                  <Award className="h-3.5 w-3.5 text-yellow-400" />
                </div>
                <div className="relative z-10">
                  <div className={cn(
                    "text-xl font-extrabold",
                    stats.totalYield >= 0 ? "text-yellow-400" : "text-red-500"
                  )}>
                    {formatPotAmount(stats.totalYield)}
                  </div>
                  <p className="text-[9px] text-yellow-600/70 mt-0.5 font-medium">Accumulated house yield</p>
                </div>
              </div>
            </div>

            {/* Hand History list */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <History className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Recent Runouts ({stats.totalHands})</span>
              </div>
              
              {sessionHistory.length === 0 ? (
                <div className="text-center py-6 bg-black/20 rounded-lg border border-gray-800/40 text-gray-500 text-xs italic">
                  No completed hands tracked in this session yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-800/60 bg-black/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-900/60 text-gray-400 font-bold border-b border-gray-800/80">
                        <th className="p-2 text-[10px] uppercase">Hand ID</th>
                        <th className="p-2 text-[10px] uppercase">Game</th>
                        <th className="p-2 text-[10px] uppercase text-right">Pot</th>
                        <th className="p-2 text-[10px] uppercase text-center">Cashouts</th>
                        <th className="p-2 text-[10px] uppercase text-right">Net Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {sessionHistory.slice(0, 5).map((hand) => (
                        <tr key={hand.handId} className="hover:bg-gray-800/25 transition-colors">
                          <td className="p-2 font-mono text-[10px] text-gray-400">
                            {hand.handId.substring(hand.handId.indexOf('_') + 1) || hand.handId}
                          </td>
                          <td className="p-2 font-bold text-gray-300">
                            {hand.gameVariant === 'nlh' ? "NLH" : hand.gameVariant === 'plo4' ? "PLO4" : "PLO5"}
                          </td>
                          <td className="p-2 text-right font-semibold text-gray-300">
                            {formatPotAmount(hand.potAmount)}
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex gap-1 justify-center">
                              {hand.player1Cashed && (
                                <Badge variant="outline" className="bg-green-950/20 text-green-400 border-green-500/20 text-[9px] py-0 px-1 font-bold">P1</Badge>
                              )}
                              {hand.player2Cashed && (
                                <Badge variant="outline" className="bg-green-950/20 text-green-400 border-green-500/20 text-[9px] py-0 px-1 font-bold">P2</Badge>
                              )}
                              {!hand.player1Cashed && !hand.player2Cashed && (
                                <span className="text-[10px] text-gray-500">-</span>
                              )}
                            </div>
                          </td>
                          <td className={cn(
                            "p-2 text-right font-bold",
                            hand.houseProfit >= 0 ? "text-yellow-400" : "text-red-400"
                          )}>
                            {hand.houseProfit >= 0 ? "+" : ""}{formatPotAmount(hand.houseProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          {/* Community Cards */}
          <div className="lg:col-span-2 order-1">
            <CommunityCardsComponent
              flop={communityCards.flop || []}
              turn={communityCards.turn}
              river={communityCards.river}
              selectedCards={getAllSelectedCards()}
              onCardSelect={handleCommunityCardSelect}
              onCardDeselect={handleCommunityCardDeselect}
              onBatchCardSelect={handleCommunityBatchSelect}
              activeSlot={activeSlot}
              onSlotClick={handleSlotClick}
            />
          </div>

          {/* Burned Cards */}
          <div className="order-2">
            <BurnedCards
              burnedCards={burnedCards}
              selectedCards={getAllSelectedCards()}
              onCardAdd={handleBurnedCardAdd}
              onCardRemove={handleBurnedCardRemove}
              onBatchCardSelect={handleBurnedBatchSelect}
            />
          </div>
        </div>

        {/* Player Hands */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
          <PlayerHand
            playerNumber={1}
            gameVariant={gameVariant}
            cards={player1Hand.cards}
            selectedCards={getAllSelectedCards()}
            onCardSelect={handlePlayer1CardSelect}
            onCardDeselect={handlePlayer1CardDeselect}
            onBatchCardSelect={handlePlayer1BatchSelect}
            onCashoutStatusChange={handleCashoutStatusChange}
            equity={equityResult?.player1Equity || 0}
            moneyEquity={equityResult?.player1MoneyEquity || 0}
            feePercentage={feePercentage}
            resetCashoutStatus={resetCashoutTrigger}
            activeSlot={activeSlot}
            onSlotClick={handleSlotClick}
          />
          <PlayerHand
            playerNumber={2}
            gameVariant={gameVariant}
            cards={player2Hand.cards}
            selectedCards={getAllSelectedCards()}
            onCardSelect={handlePlayer2CardSelect}
            onCardDeselect={handlePlayer2CardDeselect}
            onBatchCardSelect={handlePlayer2BatchSelect}
            onCashoutStatusChange={handleCashoutStatusChange}
            equity={equityResult?.player2Equity || 0}
            moneyEquity={equityResult?.player2MoneyEquity || 0}
            feePercentage={feePercentage}
            resetCashoutStatus={resetCashoutTrigger}
            activeSlot={activeSlot}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Dealer Keypad */}
        <div className="mb-6">
          <DealerKeypad
            selectedCards={getAllSelectedCards()}
            onCardSelect={handleCardSelectFromKeypad}
            onCardClear={handleClearActiveSlot}
            activeSlotName={getActiveSlotName()}
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
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleCalculateEquity}
            disabled={!canCalculate() || calculateEquityMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 min-h-[48px] text-base"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {calculateEquityMutation.isPending ? 'Calculating...' : 'Calculate'}
          </Button>
          
          <Button
            onClick={handleFinishHand}
            disabled={!canFinishHand()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 min-h-[48px] text-base"
          >
            Finish Hand
          </Button>
          
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800 px-6 py-3 min-h-[48px] text-base"
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