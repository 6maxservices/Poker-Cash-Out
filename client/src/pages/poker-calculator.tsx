import { useState, useCallback, useEffect, useRef } from "react";
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
import { Spade, Heart, DollarSign, Calculator, Monitor, ExternalLink, RotateCcw, TrendingUp, Trash2, Coins, Award, History, Landmark, Settings, X, Camera, Image, Check } from "lucide-react";
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
  photo?: string;
  timestamp: string;
}

export default function PokerCalculator() {
  const [gameVariant, setGameVariant] = useState<GameVariant>('nlh');
  const [potAmount, setPotAmount] = useState<number>(0);
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

  // Modal open states for compact tablet layout
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTvOpen, setIsTvOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  const [activeSlot, setActiveSlot] = useState<SlotTarget | null>({ type: 'player1', index: 0 });
  const [sessionHistory, setSessionHistory] = useState<SessionHand[]>([]);

  // Photo capture states for post facto checking
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedHandPhoto, setSelectedHandPhoto] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { toast } = useToast();

  const [tvAccessCode, setTvAccessCode] = useState<string>("");
  const [tvConnectedClients, setTvConnectedClients] = useState<number>(0);

  // Set dealer theme on mount
  useEffect(() => {
    setAppTheme('dealer');
  }, []);

  // Load session history on mount
  useEffect(() => {
    // 1. Load from localStorage first for instant offline PWA access
    const saved = localStorage.getItem('poker_session_history');
    if (saved) {
      try {
        setSessionHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse session history:', e);
      }
    }

    // 2. Fetch synchronized hand history from the PostgreSQL database
    fetch('/api/hands?limit=100')
      .then(res => {
        if (!res.ok) throw new Error("Sync failed");
        return res.json();
      })
      .then(data => {
        // Map database hands schema to client SessionHand layout
        const mappedHands: SessionHand[] = data.map((h: any) => ({
          handId: h.handId,
          gameVariant: h.gameVariant as GameVariant,
          potAmount: h.potAmount,
          feePercentage: h.feePercentage,
          player1Cashed: h.player1Cashed,
          player2Cashed: h.player2Cashed,
          player1Payout: h.player1Payout,
          player2Payout: h.player2Payout,
          player1Fee: h.player1Fee,
          player2Fee: h.player2Fee,
          winner: h.winner as any,
          houseProfit: h.houseProfit,
          photo: h.photo || undefined,
          timestamp: h.createdAt
        }));
        
        setSessionHistory(mappedHands);
        localStorage.setItem('poker_session_history', JSON.stringify(mappedHands));
      })
      .catch(() => {
        console.log('Running in offline mode; using local cached hand history.');
      });
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
    setIsKeypadOpen(true);
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
    if (!nextSlot) {
      setIsKeypadOpen(false);
    }
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
          feePercentage,
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

  const handleKeypadEnter = useCallback(() => {
    setIsKeypadOpen(false);
    if (canCalculate()) {
      handleCalculateEquity();
    } else {
      toast({
        title: "Keypad Closed",
        description: "Deal pad closed. Both players need all cards to calculate.",
        variant: "default",
      });
    }
  }, [canCalculate, handleCalculateEquity, toast]);

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
          feePercentage,
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
        feePercentage,
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
        feePercentage,
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
    setPotAmount(0); // Reset pot to default amount
    setActiveSlot({ type: 'player1', index: 0 });

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

    setCapturedPhoto(null);
    setIsPhotoModalOpen(true);
  };

  const completeFinishHand = (photoBase64?: string) => {
    setIsPhotoModalOpen(false);

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
        const p1MoneyRounded = Math.round(p1Money);
        p1Fee = Math.round(p1Money * (feePercentage / 100));
        p1Payout = p1MoneyRounded - p1Fee;
      }
      if (p2Cashed) {
        const p2Money = equityResult.player2MoneyEquity || 0;
        const p2MoneyRounded = Math.round(p2Money);
        p2Fee = Math.round(p2Money * (feePercentage / 100));
        p2Payout = p2MoneyRounded - p2Fee;
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
      photo: photoBase64,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [newHand, ...sessionHistory];
    saveSessionHistory(updatedHistory);

    // Save finalized hand to PostgreSQL database on the server
    apiRequest('POST', '/api/hands', {
      handId: newHand.handId,
      gameVariant: newHand.gameVariant,
      potAmount: newHand.potAmount,
      feePercentage: newHand.feePercentage,
      player1Cashed: newHand.player1Cashed,
      player2Cashed: newHand.player2Cashed,
      player1Payout: newHand.player1Payout,
      player2Payout: newHand.player2Payout,
      player1Fee: newHand.player1Fee,
      player2Fee: newHand.player2Fee,
      winner: newHand.winner,
      houseProfit: newHand.houseProfit,
      photo: newHand.photo || null
    }).catch(err => {
      console.error("Failed to sync hand with server database (saved locally):", err);
    });

    // Save hand to database/storage (finalized calculation mutate to store photo in database)
    if (photoBase64 && canCalculate()) {
      calculateEquityMutation.mutate({
        gameVariant,
        communityCards,
        player1Hand,
        player2Hand,
        potAmount,
        burnedCards,
        photo: photoBase64
      });
    }

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
      photoAttached: !!photoBase64,
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
    setActiveSlot({ type: 'player1', index: 0 });
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-950 text-white overflow-hidden flex flex-col p-2 sm:p-3 relative select-none">
      
      {/* Top Header Row (Height: ~48px) */}
      <div className="flex-shrink-0 flex items-center justify-between bg-black/45 border border-gray-800/80 rounded-xl px-4 py-2 mb-2">
        <div className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 animate-pulse" />
          <h1 className="text-sm sm:text-base font-black tracking-widest uppercase text-white leading-none">
            EQUITY<span className="text-yellow-400">LOCK</span>
          </h1>
          <Badge variant="outline" className="text-[9px] font-bold border-yellow-500/20 text-yellow-400/80 tracking-wider">
            DEALER
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Stats Trigger */}
          <Button
            onClick={() => setIsStatsOpen(true)}
            size="sm"
            variant="outline"
            className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-950/20 h-8 text-[11px] font-bold flex items-center gap-1"
          >
            <Landmark className="h-3.5 w-3.5" />
            Session Stats
          </Button>

          {/* TV Stream pairing Code display & pairing trigger */}
          <Button
            onClick={() => setIsTvOpen(true)}
            size="sm"
            variant="outline"
            className="border-purple-500/20 text-purple-300 hover:bg-purple-950/20 h-8 text-[11px] font-bold flex items-center gap-1"
          >
            <Monitor className="h-3.5 w-3.5" />
            TV Sync ({tvAccessCode || "----"})
          </Button>

          {/* Quick Settings Gear button */}
          <Button
            onClick={() => setIsSettingsOpen(true)}
            size="icon"
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 h-8 w-8 rounded-lg"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          <ThemeSelector 
            currentTheme={'dealer'}
            onThemeChange={(theme) => setAppTheme(theme)}
            className="scale-90"
          />
        </div>
      </div>

      {/* Pot Size Display & Game Information Row (Height: ~60px) */}
      <div className="flex-shrink-0 grid grid-cols-12 gap-2 mb-2 items-center">
        {/* Pot Size Card */}
        <div 
          onClick={() => setIsPotModalOpen(true)}
          className="col-span-4 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all shadow-md h-[52px]"
        >
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-white" />
            <div>
              <div className="text-[8px] font-bold text-yellow-100 uppercase tracking-widest leading-none">ACTIVE POT</div>
              <div className="text-base sm:text-lg font-black text-white leading-none mt-0.5">
                {formatPotAmount(potAmount)}
              </div>
            </div>
          </div>
          <span className="text-[8px] font-bold bg-white/20 text-white rounded px-1 py-0.5">EDIT</span>
        </div>

        {/* Current Hand / Variant details */}
        <div className="col-span-4 bg-black/40 border border-gray-800 rounded-xl p-1.5 flex justify-around items-center text-center h-[52px]">
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">GAME TYPE</span>
            <div className="flex bg-black/55 p-0.5 rounded-lg border border-gray-800/85 gap-0.5">
              <button
                type="button"
                onClick={() => setGameVariant('nlh')}
                className={cn(
                  "px-1.5 py-0.5 text-[9px] font-black rounded uppercase transition-all select-none",
                  gameVariant === 'nlh' ? "bg-yellow-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
                )}
              >
                NLH
              </button>
              <button
                type="button"
                onClick={() => setGameVariant('plo4')}
                className={cn(
                  "px-1.5 py-0.5 text-[9px] font-black rounded uppercase transition-all select-none",
                  gameVariant === 'plo4' ? "bg-yellow-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
                )}
              >
                PLO4
              </button>
              <button
                type="button"
                onClick={() => setGameVariant('plo5')}
                className={cn(
                  "px-1.5 py-0.5 text-[9px] font-black rounded uppercase transition-all select-none",
                  gameVariant === 'plo5' ? "bg-yellow-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
                )}
              >
                PLO5
              </button>
            </div>
          </div>
          <div className="w-[1px] bg-gray-800 h-6"></div>
          <div>
            <div className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">FEE RATE</div>
            <div className="text-xs font-black text-yellow-400 mt-0.5">
              {feePercentage}%
            </div>
          </div>
          <div className="w-[1px] bg-gray-800 h-6"></div>
          <Button
            onClick={handleNewHand}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white font-bold h-6 text-[9px] px-2 py-0 rounded-lg"
          >
            New Hand
          </Button>
        </div>

        {/* Main Dealer Actions Card */}
        <div className="col-span-4 bg-gradient-to-r from-gray-900 to-slate-900 border border-yellow-500/20 rounded-xl p-1.5 flex gap-2 items-center justify-between h-[52px]">
          <Button
            onClick={handleCalculateEquity}
            disabled={!canCalculate() || calculateEquityMutation.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 text-[10px] px-2"
          >
            <Calculator className="h-3 w-3 mr-1" />
            Calculate
          </Button>
          
          <Button
            onClick={handleFinishHand}
            disabled={!canFinishHand()}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black h-8 text-[10px] px-2 shadow-lg shadow-green-950/20"
          >
            <Check className="h-3 w-3 mr-1" />
            Finish Hand
          </Button>
        </div>
      </div>

      {/* Main Dealing Table Interface (Flex-Grow, Height is auto scaled, no scroll) */}
      <div className="flex-grow min-h-0 grid grid-cols-12 gap-2 sm:gap-3 overflow-hidden">
        
        {/* Left Column: Player 1 Card Hand & Cashout status (Col Span: 4) */}
        <div className="col-span-4 flex flex-col justify-between bg-black/20 border border-gray-800/80 rounded-2xl p-2 overflow-hidden">
          <div className="flex-grow overflow-hidden flex flex-col justify-center">
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
          </div>
        </div>

        {/* Center Column: Community Cards, Burned Cards & Actions (Col Span: 4) */}
        <div className="col-span-4 flex flex-col justify-between gap-2 overflow-hidden">
          {/* Community Board Card wrapper */}
          <div className="bg-black/30 border border-gray-800/60 rounded-2xl p-2.5 flex flex-col justify-center">
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

          {/* Burned Cards wrapper */}
          <div className="flex-grow flex flex-col justify-between gap-2 overflow-hidden">
            <div className="bg-black/30 border border-gray-800/60 rounded-2xl p-2 flex flex-col justify-center flex-grow">
              <BurnedCards
                burnedCards={burnedCards}
                selectedCards={getAllSelectedCards()}
                onCardAdd={handleBurnedCardAdd}
                onCardRemove={handleBurnedCardRemove}
                onBatchCardSelect={handleBurnedBatchSelect}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Player 2 Card Hand & Cashout status (Col Span: 4) */}
        <div className="col-span-4 flex flex-col justify-between bg-black/20 border border-gray-800/80 rounded-2xl p-2 overflow-hidden">
          <div className="flex-grow overflow-hidden flex flex-col justify-center">
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
        </div>

      </div>

      {/* Bottom Dealer Keyboard Overlay Sheet */}
      {isKeypadOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsKeypadOpen(false)}>
          <div 
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-yellow-500/20 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-transform duration-300 transform translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-yellow-400" />
                Quick Deal Pad — Tap cards to deal instantly ({getActiveSlotName() || "Select Slot"})
              </span>
              <Button 
                onClick={() => setIsKeypadOpen(false)}
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 h-7 text-xs font-semibold py-1 rounded-lg"
              >
                Close Pad
              </Button>
            </div>
            
            <DealerKeypad
              selectedCards={getAllSelectedCards()}
              onCardSelect={handleCardSelectFromKeypad}
              onCardClear={handleClearActiveSlot}
              activeSlotName={getActiveSlotName()}
              onEnter={handleKeypadEnter}
            />
          </div>
        </div>
      )}

      {/* Floating Keyboard Trigger at the bottom */}
      {!isKeypadOpen && (
        <div className="flex-shrink-0 flex justify-center py-1">
          <Button
            onClick={() => setIsKeypadOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-black px-4 py-2 h-9 rounded-lg shadow-md flex items-center gap-1.5 text-xs select-none"
          >
            <Calculator className="h-3.5 w-3.5" />
            DEAL PAD ({getActiveSlotName() || "Select Slot"})
          </Button>
        </div>
      )}

      {/* Settings Modal Overlay */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <Button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 bg-transparent border-none text-gray-400 hover:text-white"
              size="icon"
            >
              <X className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-black text-yellow-400 tracking-wider uppercase mb-2">GAME SETTINGS</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-gray-400 block mb-1">GAME VARIANT</Label>
                <select 
                  value={gameVariant} 
                  onChange={(e) => setGameVariant(e.target.value as GameVariant)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 h-10"
                >
                  <option value="nlh">No Limit Hold'em</option>
                  <option value="plo4">PLO4 (4 Cards)</option>
                  <option value="plo5">PLO5 (5 Cards)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-400 block mb-1">SERVICE RAKE FEE</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={feePercentage}
                    onChange={(e) => setFeePercentage(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700 text-white"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="text-gray-400">%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-gray-400 block mb-1">PLAYER 1 NAME</Label>
                  <Input
                    value={player1Name}
                    onChange={(e) => setPlayer1Name(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-400 block mb-1">PLAYER 2 NAME</Label>
                  <Input
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 mt-4"
            >
              SAVE & APPLY
            </Button>
          </div>
        </div>
      )}

      {/* TV Stream Sync Modal */}
      {isTvOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <Button
              onClick={() => setIsTvOpen(false)}
              className="absolute top-4 right-4 bg-transparent border-none text-gray-400 hover:text-white"
              size="icon"
            >
              <X className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-black text-purple-400 tracking-wider uppercase mb-2">TV STREAM PAIRING</h3>

            <div className="space-y-4">
              <div className="bg-black/50 border border-purple-900/50 rounded-xl p-4 text-center">
                <span className="text-[10px] font-bold text-purple-300 block mb-1">TV ACCESS CODE</span>
                <span className="text-4xl font-black font-mono tracking-widest text-green-400">
                  {tvAccessCode || "----"}
                </span>
                <p className="text-[10px] text-gray-500 mt-2">
                  {tvConnectedClients} TV Displays Active
                </p>
              </div>

               <div>
                <Label className="text-xs font-bold text-gray-400 block mb-1">STREAM LAYOUT THEME</Label>
                <select 
                  value={launchTheme} 
                  onChange={(e) => setLaunchTheme(e.target.value as any)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 h-10"
                >
                  <option value="gold">VIP Gold Theme</option>
                  <option value="felt">Vegas Green Felt</option>
                  <option value="cyber">Cyber Neon Theme</option>
                  <option value="overlay">OBS Transparent Overlay</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button
                variant="outline"
                onClick={regenerateTvCode}
                className="border-purple-500/40 text-purple-200 hover:bg-purple-950/20"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                New Code
              </Button>
              <Button
                asChild
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                <a href={`/tv?theme=${launchTheme}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Launch TV
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session Stats and Profitability Modal */}
      {isStatsOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-yellow-500/20 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <Button
              onClick={() => setIsStatsOpen(false)}
              className="absolute top-4 right-4 bg-transparent border-none text-gray-400 hover:text-white"
              size="icon"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-black text-yellow-400 tracking-wider uppercase">SESSION PERFORMANCE & LEDGER</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleClearSession();
                  setIsStatsOpen(false);
                }}
                disabled={sessionHistory.length === 0}
                className="border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs font-semibold py-1 h-7 rounded-lg"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                Reset Session
              </Button>
            </div>

            {/* Grid of indicators */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/50 border border-gray-800 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">Guaranteed Rake Fees</span>
                <span className="text-lg font-black text-blue-400">{formatPotAmount(stats.totalGuaranteed)}</span>
              </div>
              <div className="bg-black/50 border border-gray-800 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">Insurance Risk P&L</span>
                <span className={cn("text-lg font-black", stats.totalRealized >= 0 ? "text-amber-400" : "text-red-400")}>
                  {stats.totalRealized >= 0 ? "+" : ""}{formatPotAmount(stats.totalRealized)}
                </span>
              </div>
              <div className="bg-black/50 border border-yellow-500/20 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold text-yellow-500 tracking-wider uppercase block mb-1">Total Session Yield</span>
                <span className={cn("text-lg font-black", stats.totalYield >= 0 ? "text-yellow-400" : "text-red-500")}>
                  {formatPotAmount(stats.totalYield)}
                </span>
              </div>
            </div>

            {/* Table of Hand History */}
            <div className="mt-4">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">RECENT RUNOUTS HISTORY</span>
              {sessionHistory.length === 0 ? (
                <div className="text-center py-6 bg-black/20 rounded-lg border border-gray-800/40 text-gray-500 text-xs italic">
                  No completed hands tracked in this session yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-800/60 bg-black/20 max-h-[250px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-900/60 text-gray-400 font-bold border-b border-gray-800/80 sticky top-0">
                        <th className="p-2 text-[10px] uppercase">Hand ID</th>
                        <th className="p-2 text-[10px] uppercase">Game</th>
                        <th className="p-2 text-[10px] uppercase text-right">Pot</th>
                        <th className="p-2 text-[10px] uppercase text-center">Cashouts</th>
                        <th className="p-2 text-[10px] uppercase text-right">Net Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {sessionHistory.map((hand) => (
                        <tr key={hand.handId} className="hover:bg-gray-800/25 transition-colors">
                          <td className="p-2 font-mono text-[10px] text-gray-400 flex items-center gap-1.5">
                            <span>{hand.handId.substring(hand.handId.indexOf('_') + 1) || hand.handId}</span>
                            {hand.photo && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setSelectedHandPhoto(hand.photo || null)}
                                className="h-5 w-5 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded"
                                title="View Captured Hand Photo"
                              >
                                <Camera className="h-3.5 w-3.5" />
                              </Button>
                            )}
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
      )}
      
      {/* Photo Capture Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-yellow-500/20 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-sm font-black text-yellow-400 tracking-wider uppercase mb-2 text-center flex items-center justify-center gap-1.5">
              <Camera className="h-4 w-4 text-yellow-400" />
              SNAP TABLE PROOF
            </h3>
            
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 flex flex-col items-center justify-center">
              {capturedPhoto ? (
                <img 
                  src={capturedPhoto} 
                  alt="Captured Hand Preview" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-4 space-y-3">
                  <Camera className="h-10 w-10 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400 max-w-[280px]">
                    Table camera ready. Tap below to capture hand proof directly using your tablet's native camera.
                  </p>
                  
                  {/* Native Tablet Camera Trigger */}
                  <label htmlFor="table-snap-camera-input" className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-black px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-155 text-xs shadow-md">
                    📷 OPEN NATIVE CAMERA
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      id="table-snap-camera-input"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="flex flex-col gap-2">
              {capturedPhoto && (
                <div className="flex gap-2">
                  {/* Retake using device native camera */}
                  <label htmlFor="table-snap-camera-retake" className="flex-1 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg cursor-pointer transition-colors text-xs font-semibold h-10 border border-gray-700">
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Retake Snap
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      id="table-snap-camera-retake"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <div className="w-full bg-gray-800/30 h-[1px] my-1"></div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setIsPhotoModalOpen(false);
                    completeFinishHand(capturedPhoto || undefined);
                  }}
                  className={cn(
                    "font-bold text-xs h-11 transition-all",
                    capturedPhoto 
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-950/20" 
                      : "bg-gray-800 hover:bg-gray-700 text-gray-400"
                  )}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {capturedPhoto ? "SAVE & FINISH" : "SKIP & FINISH"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPhotoModalOpen(false);
                  }}
                  className="border-gray-800 hover:bg-gray-800 text-gray-400 font-bold text-xs h-11"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hand Photo Viewer Modal */}
      {selectedHandPhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedHandPhoto(null)}>
          <div 
            className="bg-gray-950 border-2 border-yellow-500/30 rounded-2xl max-w-lg w-full p-4 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-800/80 pb-2">
              <span className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                <Camera className="h-4 w-4" />
                POST FACTO TABLE PROOF
              </span>
              <Button 
                onClick={() => setSelectedHandPhoto(null)}
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 h-7 text-xs font-semibold py-1 rounded-lg"
              >
                Close View
              </Button>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-800 bg-black flex items-center justify-center">
              <img 
                src={selectedHandPhoto} 
                alt="Poker Table Hand Proof" 
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Existing Pot Amount Modal */}
      <PotAmountModal
        isOpen={isPotModalOpen}
        onClose={() => setIsPotModalOpen(false)}
        currentAmount={potAmount}
        onAmountChange={setPotAmount}
      />
    </div>
  );
}