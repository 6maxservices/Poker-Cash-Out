import { useState, useEffect, useCallback, useRef } from "react";
import { tvApiClient, TVGameState } from "@/lib/tv-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Monitor, Wifi, RotateCcw, Trophy, X, Clock, Palette, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type TVTheme = 'gold' | 'felt' | 'cyber' | 'overlay';

const LogoSVG = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shield Base Outline */}
    <path 
      d="M50 5L15 15V45C15 70 35 90 50 95C65 90 85 70 85 45V15L50 5Z" 
      fill="url(#shieldGrad)" 
      stroke="#EAB308" 
      strokeWidth="3.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Spade Icon in the middle */}
    <path 
      d="M50 22C46.5 22 39 31.5 39 41.5C39 49 44.5 53 48.5 53C47.8 55.5 45.5 62 41 72H59C54.5 62 52.2 55.5 51.5 53C55.5 53 61 49 61 41.5C61 31.5 53.5 22 50 22Z" 
      fill="#FFFFFF" 
    />
    {/* Keyhole inside Spade representing Lock */}
    <circle cx="50" cy="40" r="4.5" fill="#EAB308" />
    <path d="M47.5 40H52.5L53.5 50H46.5L47.5 40Z" fill="#EAB308" />
    
    <defs>
      <linearGradient id="shieldGrad" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1E1B4B" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
    </defs>
  </svg>
);

export default function TVDisplay() {
  const [gameState, setGameState] = useState<TVGameState | null>(null);
  const [accessCode, setAccessCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeCelebration, setActiveCelebration] = useState<{
    isDouble: boolean;
    player1Name?: string;
    player1Amount?: number;
    player2Name?: string;
    player2Amount?: number;
    singlePlayerName?: string;
    singleAmount?: number;
    timestamp: number;
  } | null>(null);
  
  // Read initial theme from URL query param or fallback to 'gold'
  const [tvTheme, setTvTheme] = useState<TVTheme>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get('theme') as TVTheme;
    return ['gold', 'felt', 'cyber', 'overlay'].includes(urlTheme) ? urlTheme : 'gold';
  });

  const [particles, setParticles] = useState<any[]>([]);

  // Apply body classes for custom themes
  useEffect(() => {
    document.body.className = `tv-theme theme-${tvTheme}`;
    return () => {
      document.body.className = '';
    };
  }, [tvTheme]);

  // Generate particles for cashout celebration
  useEffect(() => {
    const p1Cashed = gameState?.player1CashoutStatus === 'approved';
    const p2Cashed = gameState?.player2CashoutStatus === 'approved';

    if (p1Cashed && p2Cashed) {
      setActiveCelebration({
        isDouble: true,
        player1Name: gameState?.player1Name || 'Player 1',
        player1Amount: gameState?.player1MoneyEquity || 0,
        player2Name: gameState?.player2Name || 'Player 2',
        player2Amount: gameState?.player2MoneyEquity || 0,
        timestamp: Date.now()
      });

      // Generate chip particle positions - even more intense for double cashout!
      const generated = Array.from({ length: 65 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        driftX: (Math.random() * 200 - 100) + 'px',
        duration: (Math.random() * 2 + 2) + 's',
      }));
      setParticles(generated);
    } else if (p1Cashed || p2Cashed) {
      const isP1 = p1Cashed;
      const playerName = isP1 
        ? (gameState?.player1Name || 'Player 1') 
        : (gameState?.player2Name || 'Player 2');
      const cashoutAmount = isP1 
        ? (gameState?.player1MoneyEquity || 0) 
        : (gameState?.player2MoneyEquity || 0);

      setActiveCelebration({
        isDouble: false,
        singlePlayerName: playerName,
        singleAmount: cashoutAmount,
        timestamp: Date.now()
      });

      // Generate chip particle positions
      const generated = Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        driftX: (Math.random() * 160 - 80) + 'px',
        duration: (Math.random() * 2 + 2.5) + 's',
      }));
      setParticles(generated);
    } else {
      setParticles([]);
      setActiveCelebration(null);
    }
  }, [gameState?.player1CashoutStatus, gameState?.player2CashoutStatus, gameState?.handId]);

  const connectToStream = useCallback((code: string) => {
    if (eventSource) {
      eventSource.close();
    }

    setConnectionStatus('connecting');
    const newEventSource = tvApiClient.createEventSource(code);

    newEventSource.onopen = () => {
      console.log('TV Display: Connected to stream');
      setIsConnected(true);
      setConnectionStatus('connected');
      setAccessCode(code);
    };

    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as TVGameState;
        setGameState(data);
        setLastUpdate(new Date());
        console.log('TV Display: Game state updated:', data);
      } catch (error) {
        console.error('TV Display: Error parsing state:', error);
      }
    };

    newEventSource.onerror = (error) => {
      console.error('TV Display: Stream error:', error);
      setIsConnected(false);
      setConnectionStatus('error');

      // Auto reconnect
      setTimeout(() => {
        if (accessCode) {
          connectToStream(accessCode);
        }
      }, 3000);
    };

    setEventSource(newEventSource);
  }, [eventSource, accessCode]);

  const handleConnect = () => {
    if (inputCode.trim()) {
      connectToStream(inputCode.trim().toUpperCase());
    }
  };

  const handleDisconnect = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setAccessCode("");
    setGameState(null);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const isRedSuit = (suit: string): boolean => {
    return suit === '♥' || suit === '♦';
  };

  const renderCard = (card: any) => {
    if (!card) return null;

    return (
      <div className="casino-card-model w-14 h-20 sm:w-16 sm:h-22 flex flex-col items-center justify-between py-2 px-1 relative select-none">
        {/* Top Rank + Suit */}
        <div className="self-start pl-1 flex flex-col items-center leading-none">
          <span className={cn("text-sm font-black leading-none", isRedSuit(card.suit) ? "text-red-600" : "text-gray-900")}>
            {card.rank}
          </span>
          <span className={cn("text-xs leading-none mt-0.5", isRedSuit(card.suit) ? "text-red-600" : "text-gray-900")}>
            {card.suit}
          </span>
        </div>

        {/* Center Large Suit Graphic */}
        <div className={cn("text-2xl leading-none absolute inset-0 flex items-center justify-center pointer-events-none opacity-90", isRedSuit(card.suit) ? "suit-glow-red" : "suit-glow-black")}>
          {card.suit}
        </div>

        {/* Bottom Rank + Suit Inverted */}
        <div className="self-end pr-1 flex flex-col items-center leading-none transform rotate-180">
          <span className={cn("text-sm font-black leading-none", isRedSuit(card.suit) ? "text-red-600" : "text-gray-900")}>
            {card.rank}
          </span>
          <span className={cn("text-xs leading-none mt-0.5", isRedSuit(card.suit) ? "text-red-600" : "text-gray-900")}>
            {card.suit}
          </span>
        </div>
      </div>
    );
  };

  // Labeled placeholders for community board
  const renderCommunityCards = () => {
    if (!gameState?.communityCards) return null;

    const { flop, turn, river } = gameState.communityCards;
    const isFlopFilled = flop && flop.length === 3;
    const isTurnFilled = !!turn;
    const isRiverFilled = !!river;

    return (
      <div className={cn(
        "rounded-2xl p-5 border",
        tvTheme === 'felt' ? "tv-card-felt" :
        tvTheme === 'cyber' ? "tv-card-cyber" :
        tvTheme === 'overlay' ? "tv-card-overlay bg-slate-950/95" :
        "tv-card-gold"
      )}>
        <div className="text-center">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">COMMUNITY BOARD</span>
            <div className="flex gap-2">
              <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 border-none", isFlopFilled ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400")}>
                FLOP
              </Badge>
              <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 border-none", isTurnFilled ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400")}>
                TURN
              </Badge>
              <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 border-none", isRiverFilled ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400")}>
                RIVER
              </Badge>
            </div>
          </div>
          
          <div className="flex justify-center gap-3 py-2 bg-black/40 rounded-xl border border-gray-800/50 p-4">
            {/* Flop Slot 1 */}
            {flop && flop[0] ? renderCard(flop[0]) : (
              <div className="w-14 h-20 sm:w-16 sm:h-22 bg-gray-800/40 rounded-lg flex items-center justify-center border-2 border-gray-700/60 border-dashed">
                <span className="text-gray-500 font-bold text-xs">F1</span>
              </div>
            )}
            {/* Flop Slot 2 */}
            {flop && flop[1] ? renderCard(flop[1]) : (
              <div className="w-14 h-20 sm:w-16 sm:h-22 bg-gray-800/40 rounded-lg flex items-center justify-center border-2 border-gray-700/60 border-dashed">
                <span className="text-gray-500 font-bold text-xs">F2</span>
              </div>
            )}
            {/* Flop Slot 3 */}
            {flop && flop[2] ? renderCard(flop[2]) : (
              <div className="w-14 h-20 sm:w-16 sm:h-22 bg-gray-800/40 rounded-lg flex items-center justify-center border-2 border-gray-700/60 border-dashed">
                <span className="text-gray-500 font-bold text-xs">F3</span>
              </div>
            )}
            
            {/* Divider */}
            <div className="w-[1.5px] bg-gray-800 self-stretch my-2"></div>

            {/* Turn Slot */}
            {turn ? renderCard(turn) : (
              <div className="w-14 h-20 sm:w-16 sm:h-22 bg-gray-800/40 rounded-lg flex items-center justify-center border-2 border-gray-700/60 border-dashed">
                <span className="text-gray-500 font-bold text-xs">T</span>
              </div>
            )}

            {/* Divider */}
            <div className="w-[1.5px] bg-gray-800 self-stretch my-2"></div>

            {/* River Slot */}
            {river ? renderCard(river) : (
              <div className="w-14 h-20 sm:w-16 sm:h-22 bg-gray-800/40 rounded-lg flex items-center justify-center border-2 border-gray-700/60 border-dashed">
                <span className="text-gray-500 font-bold text-xs">R</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 bg-gray-900/90 backdrop-blur border-purple-500/25 shadow-2xl rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="text-center space-y-6">
            <div className="flex justify-center relative">
              <div className="p-3 bg-purple-950/40 rounded-2xl border border-purple-500/30">
                <Monitor className="h-12 w-12 sm:h-14 sm:w-14 text-purple-400 animate-pulse" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                Live Stream Display
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Cast beautiful overlays & stats to monitors
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="accessCode" className="text-gray-300 text-xs font-bold tracking-widest uppercase block text-left mb-2 pl-1">
                  Access Pairing Code
                </Label>
                <Input
                  id="accessCode"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  maxLength={6}
                  className="text-center text-xl sm:text-2xl font-black font-mono tracking-[0.4em] bg-black/60 border-purple-500/20 hover:border-purple-500/40 focus:border-purple-500 text-white min-h-[56px] rounded-xl shadow-inner transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                />
              </div>

              <Button 
                onClick={handleConnect} 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-t border-purple-400 text-white font-bold tracking-wider py-4 min-h-[52px] text-base rounded-xl transition-transform active:scale-[0.98] shadow-lg shadow-purple-500/10"
                disabled={connectionStatus === 'connecting' || inputCode.length !== 6}
              >
                {connectionStatus === 'connecting' ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                    CONNECTING...
                  </>
                ) : (
                  'ESTABLISH STREAM'
                )}
              </Button>

              {connectionStatus === 'error' && (
                <p className="text-red-400 text-xs font-bold text-center animate-bounce">
                  Connection failed. Invalid or expired stream code.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Calculate live equity comparative splits
  const p1Equity = gameState?.player1Equity ?? 0;
  const p2Equity = gameState?.player2Equity ?? 0;
  const totalEquity = p1Equity + p2Equity || 100;
  const p1Ratio = (p1Equity / totalEquity) * 100;
  const p2Ratio = (p2Equity / totalEquity) * 100;

  const isP1Leading = p1Equity > p2Equity;
  const isP2Leading = p2Equity > p1Equity;
  const isDraw = p1Equity === p2Equity && p1Equity > 0;

  return (
    <div className={cn(
      "min-h-screen relative p-4 sm:p-6 text-white overflow-x-hidden",
      tvTheme === 'overlay' ? "p-0" : ""
    )}>
      {/* Translucent Corner Watermark Logo (Floating in OBS Overlay Mode / Broadcast View) */}
      <div className={cn(
        "z-50 pointer-events-none select-none flex items-center space-x-2 bg-black/45 backdrop-blur border border-yellow-500/10 py-1.5 px-3 rounded-full shadow-2xl transition-all duration-500",
        tvTheme === 'overlay' ? "fixed top-6 right-6 opacity-75" : "absolute top-4 right-4 opacity-50 sm:opacity-75 sm:top-6 sm:right-6"
      )}>
        <LogoSVG className="h-5 w-5" />
        <span className="text-[10px] font-black tracking-[0.25em] text-white">
          EQUITY<span className="text-yellow-400">LOCK</span>
        </span>
      </div>

      {/* Approved Cashout Confetti Chip Rain Celebration Backdrop */}
      {activeCelebration && (
        <div className="celebration-overlay">
          {particles.map(p => (
            <div 
              key={p.id}
              className="chip-particle"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: p.duration,
                '--drift-x': p.driftX
              } as any}
            />
          ))}
          
          <div className="celebration-plaque max-w-xl">
            <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
            
            {activeCelebration.isDouble ? (
              <>
                <h2 className="text-2xl sm:text-3xl font-black text-yellow-400 tracking-wider mb-1 uppercase">
                  DOUBLE CASHOUT SECURED!
                </h2>
                <div className="h-[2px] bg-yellow-500/40 my-3"></div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-around mt-4 mb-2">
                  <div className="p-3 bg-black/40 rounded-xl border border-gray-800/80 min-w-[160px]">
                    <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase block mb-1">
                      {activeCelebration.player1Name?.toUpperCase()}
                    </span>
                    <span className="text-2xl font-extrabold text-white">
                      {formatCurrency(activeCelebration.player1Amount || 0)}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-black/40 rounded-xl border border-gray-800/80 min-w-[160px]">
                    <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase block mb-1">
                      {activeCelebration.player2Name?.toUpperCase()}
                    </span>
                    <span className="text-2xl font-extrabold text-white">
                      {formatCurrency(activeCelebration.player2Amount || 0)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest block">
                    TOTAL GUARANTEED CASHOUT
                  </span>
                  <span className="text-3xl font-black text-white block mt-0.5">
                    {formatCurrency((activeCelebration.player1Amount || 0) + (activeCelebration.player2Amount || 0))}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl sm:text-3xl font-black text-yellow-400 tracking-wider mb-2 uppercase">
                  CASHOUT SECURED!
                </h2>
                <div className="h-[2px] bg-yellow-500/40 my-3"></div>
                <p className="text-gray-300 text-lg mb-1">
                  {activeCelebration.singlePlayerName} cashed out guaranteed money:
                </p>
                <p className="text-4xl sm:text-5xl font-black text-white mt-2 tracking-tight">
                  {formatCurrency(activeCelebration.singleAmount || 0)}
                </p>
              </>
            )}
            
            <p className="text-[9px] text-gray-500 mt-4 uppercase tracking-widest font-bold">
              Host has locked in EV equity insurance
            </p>
          </div>
        </div>
      )}

      {/* Floating Theme / Action Controls Selector (hidden in OBS Overlay theme to avoid capturing) */}
      {tvTheme !== 'overlay' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 bg-black/40 backdrop-blur border border-gray-800/80 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <LogoSVG className="h-8 w-8 animate-pulse" />
            <div>
              <h1 className="text-base font-black tracking-widest uppercase text-white leading-none">
                EQUITY<span className="text-yellow-400">LOCK</span> LIVE
              </h1>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 block">Live Table Statistics Overlay</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Mini Theme pills */}
            <div className="bg-black/50 border border-gray-800 rounded-xl p-1 flex gap-1 items-center">
              <Palette className="h-3 w-3 text-gray-400 ml-1.5" />
              <button 
                onClick={() => setTvTheme('gold')}
                className={cn("text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg transition-colors", tvTheme === 'gold' ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white")}
              >
                VIP Gold
              </button>
              <button 
                onClick={() => setTvTheme('felt')}
                className={cn("text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg transition-colors", tvTheme === 'felt' ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white")}
              >
                Vegas Felt
              </button>
              <button 
                onClick={() => setTvTheme('cyber')}
                className={cn("text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg transition-colors", tvTheme === 'cyber' ? "bg-pink-600 text-white" : "text-gray-400 hover:text-white")}
              >
                Cyber
              </button>
              <button 
                onClick={() => setTvTheme('overlay')}
                className={cn("text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg transition-colors", (tvTheme as string) === 'overlay' ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white")}
              >
                OBS Overlay
              </button>
            </div>

            <Badge variant="outline" className="bg-green-600/20 border-green-600 text-green-400 text-xs font-bold py-1 px-3">
              Stream Code: {accessCode}
            </Badge>
            <Button onClick={handleDisconnect} variant="outline" size="sm" className="border-red-500/20 text-red-400 hover:bg-red-950/20 hover:text-red-300 min-h-[36px] text-xs font-bold">
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {/* Main Broadcast Screen Area */}
      {gameState ? (
        <div className={cn(
          "space-y-6",
          tvTheme === 'overlay' ? "space-y-0 fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent border-t-2 border-yellow-500/40" : ""
        )}>
          {/* Overlay Mode Lower Third Grid vs Broadcast dashboard layout */}
          {tvTheme === 'overlay' ? (
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Left Pot display */}
              <div className="col-span-3 bg-black/60 border border-yellow-500/40 rounded-xl p-3 text-center">
                <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest block mb-0.5">CURRENT POT</span>
                <span className="text-2xl font-black text-white tracking-tight">
                  {formatCurrency(gameState.potAmount)}
                </span>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mt-0.5">
                  {gameState.gameVariant.toUpperCase()}
                </span>
              </div>

              {/* Center Board Cards */}
              <div className="col-span-5">
                {renderCommunityCards()}
              </div>

              {/* Right Dual Player Cards */}
              <div className="col-span-4 flex flex-col gap-2">
                {/* Horizontal comparative bar */}
                <div className="equity-gauge-track relative">
                  <div 
                    className="equity-gauge-bar p1-bar"
                    style={{ width: `${p1Ratio}%` }}
                  >
                    {p1Equity > 0 ? formatPercentage(p1Equity) : ""}
                  </div>
                  <div 
                    className="equity-gauge-bar p2-bar"
                    style={{ width: `${p2Ratio}%` }}
                  >
                    {p2Equity > 0 ? formatPercentage(p2Equity) : ""}
                  </div>
                  <div 
                    className="equity-gauge-divider"
                    style={{ left: `${p1Ratio}%` }}
                  />
                </div>

                {/* Micro hands summary display */}
                <div className="flex gap-2">
                  {/* Player 1 Micro card details */}
                  <div className={cn(
                    "flex-1 bg-black/70 border border-gray-800 rounded-xl p-2 flex items-center justify-between",
                    isP1Leading ? "border-emerald-500 shadow-md shadow-emerald-500/10" : ""
                  )}>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase truncate block text-gray-200">
                        {gameState.player1Name || 'P1'}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {gameState.player1Equity !== null ? formatPercentage(gameState.player1Equity) : "--%"}
                      </span>
                    </div>
                    {/* Micro Cards */}
                    <div className="flex gap-0.5 scale-[0.65] origin-right translate-x-1">
                      {gameState.player1Hand?.slice(0, 2).map((c, i) => (
                        <div key={i} className="bg-white rounded p-0.5 text-center text-[10px] text-black font-bold h-7 w-5 flex items-center justify-center">
                          {c.rank}{c.suit}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Player 2 Micro card details */}
                  <div className={cn(
                    "flex-1 bg-black/70 border border-gray-800 rounded-xl p-2 flex items-center justify-between",
                    isP2Leading ? "border-red-500 shadow-md shadow-red-500/10" : ""
                  )}>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase truncate block text-gray-200">
                        {gameState.player2Name || 'P2'}
                      </span>
                      <span className="text-xs font-bold text-red-400">
                        {gameState.player2Equity !== null ? formatPercentage(gameState.player2Equity) : "--%"}
                      </span>
                    </div>
                    {/* Micro Cards */}
                    <div className="flex gap-0.5 scale-[0.65] origin-right translate-x-1">
                      {gameState.player2Hand?.slice(0, 2).map((c, i) => (
                        <div key={i} className="bg-white rounded p-0.5 text-center text-[10px] text-black font-bold h-7 w-5 flex items-center justify-center">
                          {c.rank}{c.suit}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Full Broadcast Dashboard Layout
            <div className="space-y-6">
              {/* Top Banner Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Variant */}
                <div className={cn(
                  "rounded-2xl p-4 border text-center flex flex-col justify-center",
                  tvTheme === 'felt' ? "tv-card-felt" :
                  tvTheme === 'cyber' ? "tv-card-cyber" :
                  "tv-card-gold"
                )}>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">SESSION STAGE</span>
                  <span className="text-2xl font-black text-white tracking-wide uppercase">
                    {gameState.gameVariant === 'nlh' ? "No Limit Hold'em" : gameState.gameVariant.toUpperCase()}
                  </span>
                </div>

                {/* Pot display */}
                <div className={cn(
                  "rounded-2xl p-4 border text-center relative overflow-hidden",
                  tvTheme === 'felt' ? "tv-card-felt" :
                  tvTheme === 'cyber' ? "tv-card-cyber border-pink-500/40" :
                  "tv-card-gold border-yellow-500/45"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none"></div>
                  <span className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase block mb-1">ACTIVE POT SIZE</span>
                  <span className="text-4xl font-extrabold text-white tracking-tight">
                    {formatCurrency(gameState.potAmount)}
                  </span>
                </div>

                {/* Status Indicator */}
                <div className={cn(
                  "rounded-2xl p-4 border text-center flex flex-col justify-center",
                  tvTheme === 'felt' ? "tv-card-felt" :
                  tvTheme === 'cyber' ? "tv-card-cyber" :
                  "tv-card-gold"
                )}>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">TV STREAM STATUS</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                    <span className="text-lg font-black text-green-400 uppercase tracking-widest">LIVE BROADCAST</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Real-Time Equity Duel Bar */}
              {gameState.player1Equity !== null && gameState.player2Equity !== null && (
                <div className="bg-black/40 border border-gray-800 rounded-2xl p-5 shadow-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">LIVE WIN PROBABILITY GAUGE</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">20,000 Iterations Calculated</span>
                  </div>
                  
                  {/* Track Fill */}
                  <div className="equity-gauge-track relative h-7">
                    <div 
                      className="equity-gauge-bar p1-bar"
                      style={{ width: `${p1Ratio}%` }}
                    >
                      {p1Equity > 0 ? `${(gameState.player1Name || 'Player 1').toUpperCase()}: ${formatPercentage(p1Equity)}` : ""}
                    </div>
                    <div 
                      className="equity-gauge-bar p2-bar"
                      style={{ width: `${p2Ratio}%` }}
                    >
                      {p2Equity > 0 ? `${(gameState.player2Name || 'Player 2').toUpperCase()}: ${formatPercentage(p2Equity)}` : ""}
                    </div>
                    <div 
                      className="equity-gauge-divider"
                      style={{ left: `${p1Ratio}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Center Board */}
              {renderCommunityCards()}

              {/* Main Player Display Panel side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Player 1 Details */}
                <Card className={cn(
                  "p-6 border transition-all duration-300 relative overflow-hidden",
                  tvTheme === 'felt' ? "tv-card-felt" :
                  tvTheme === 'cyber' ? "tv-card-cyber" :
                  "tv-card-gold",
                  isP1Leading ? "leader-pulse-ring border-yellow-500 shadow-yellow-500/20" : ""
                )}>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white tracking-tight uppercase">
                        {gameState.player1Name || 'Player 1'}
                      </h3>
                      {isP1Leading && (
                        <Badge variant="outline" className="bg-yellow-500/25 border-yellow-500 text-yellow-400 font-extrabold text-[9px] tracking-wider uppercase animate-pulse">
                          👑 LEADER
                        </Badge>
                      )}
                    </div>
                    {gameState.player1Equity !== null && (
                      <span className="text-3xl font-extrabold text-emerald-400">
                        {formatPercentage(gameState.player1Equity)}
                      </span>
                    )}
                  </div>

                  {/* Hole Cards */}
                  {gameState.player1Hand && gameState.player1Hand.length > 0 ? (
                    <div className="flex justify-center gap-3 py-4 bg-black/40 rounded-2xl border border-gray-800/40 mb-4 p-4 min-h-[120px] items-center">
                      {gameState.player1Hand.map((c, i) => (
                        <div key={i} className="transform hover:scale-105 transition-transform duration-300">
                          {renderCard(c)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[120px] bg-black/35 rounded-2xl border border-gray-800/40 border-dashed flex items-center justify-center mb-4 text-gray-500 font-bold text-xs italic">
                      Hole Cards Undealt
                    </div>
                  )}

                  {/* Bottom Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3 text-center">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">ESTIMATED EV VALUE</span>
                      <span className="text-lg font-black text-yellow-400">
                        {gameState.player1MoneyEquity ? formatCurrency(gameState.player1MoneyEquity) : '$0'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center bg-black/40 border border-gray-800/80 rounded-xl p-3 text-center">
                      {gameState.player1CashoutStatus === 'pending' && (
                        <div className="text-orange-400 font-bold text-xs tracking-wider flex items-center gap-1.5 animate-pulse">
                          <Clock className="h-4 w-4" />
                          PENDING
                        </div>
                      )}
                      {gameState.player1CashoutStatus === 'approved' && (
                        <div className="text-green-400 font-black text-xs tracking-wider flex items-center gap-1.5 animate-bounce">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                          CASHOUT APPROVED
                        </div>
                      )}
                      {gameState.player1CashoutStatus === 'rejected' && (
                        <span className="text-red-400 font-bold text-xs tracking-wider flex items-center gap-1">
                          <X className="h-4 w-4" />
                          REJECTED
                        </span>
                      )}
                      {!gameState.player1CashoutStatus && (
                        <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">ACTIVE IN HAND</span>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Player 2 Details */}
                <Card className={cn(
                  "p-6 border transition-all duration-300 relative overflow-hidden",
                  tvTheme === 'felt' ? "tv-card-felt" :
                  tvTheme === 'cyber' ? "tv-card-cyber" :
                  "tv-card-gold",
                  isP2Leading ? "leader-pulse-ring border-yellow-500 shadow-yellow-500/20" : ""
                )}>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white tracking-tight uppercase">
                        {gameState.player2Name || 'Player 2'}
                      </h3>
                      {isP2Leading && (
                        <Badge variant="outline" className="bg-yellow-500/25 border-yellow-500 text-yellow-400 font-extrabold text-[9px] tracking-wider uppercase animate-pulse">
                          👑 LEADER
                        </Badge>
                      )}
                    </div>
                    {gameState.player2Equity !== null && (
                      <span className="text-3xl font-extrabold text-red-400">
                        {formatPercentage(gameState.player2Equity)}
                      </span>
                    )}
                  </div>

                  {/* Hole Cards */}
                  {gameState.player2Hand && gameState.player2Hand.length > 0 ? (
                    <div className="flex justify-center gap-3 py-4 bg-black/40 rounded-2xl border border-gray-800/40 mb-4 p-4 min-h-[120px] items-center">
                      {gameState.player2Hand.map((c, i) => (
                        <div key={i} className="transform hover:scale-105 transition-transform duration-300">
                          {renderCard(c)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[120px] bg-black/35 rounded-2xl border border-gray-800/40 border-dashed flex items-center justify-center mb-4 text-gray-500 font-bold text-xs italic">
                      Hole Cards Undealt
                    </div>
                  )}

                  {/* Bottom Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3 text-center">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">ESTIMATED EV VALUE</span>
                      <span className="text-lg font-black text-yellow-400">
                        {gameState.player2MoneyEquity ? formatCurrency(gameState.player2MoneyEquity) : '$0'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center bg-black/40 border border-gray-800/80 rounded-xl p-3 text-center">
                      {gameState.player2CashoutStatus === 'pending' && (
                        <div className="text-orange-400 font-bold text-xs tracking-wider flex items-center gap-1.5 animate-pulse">
                          <Clock className="h-4 w-4" />
                          PENDING
                        </div>
                      )}
                      {gameState.player2CashoutStatus === 'approved' && (
                        <div className="text-green-400 font-black text-xs tracking-wider flex items-center gap-1.5 animate-bounce">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                          CASHOUT APPROVED
                        </div>
                      )}
                      {gameState.player2CashoutStatus === 'rejected' && (
                        <span className="text-red-400 font-bold text-xs tracking-wider flex items-center gap-1">
                          <X className="h-4 w-4" />
                          REJECTED
                        </span>
                      )}
                      {!gameState.player2CashoutStatus && (
                        <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">ACTIVE IN HAND</span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Timestamp Stats Footer */}
              <div className="text-center text-[10px] text-gray-500 font-mono tracking-widest uppercase py-3 border-t border-gray-800/50 mt-4">
                {lastUpdate && `STREAM STATE CAPTURED: ${lastUpdate.toLocaleTimeString()} `}
                {gameState.handId && `| SYSTEM RUN ID: ${gameState.handId}`}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Standard Idle Screen
        <div className="space-y-6">
          <Card className="p-10 bg-black/60 backdrop-blur border border-yellow-500/20 text-center rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-black/45 rounded-full border border-yellow-500/25 shadow-lg shadow-yellow-500/5 animate-pulse">
                <LogoSVG className="h-20 w-20" />
              </div>
            </div>
            
            <h2 className="text-3xl font-black tracking-[0.25em] text-white uppercase mb-2">
              EQUITY<span className="text-yellow-400">LOCK</span>
            </h2>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em] block mb-6">
              Live TV Broadcast Statistics System
            </span>
            
            <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-800 to-transparent my-4"></div>
            
            <p className="text-sm text-gray-300 max-w-md mx-auto leading-relaxed mt-4">
              Awaiting stream connection from the dealer panel. Open your dealer console, pairing code is ready, and launch active hand calculations.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}