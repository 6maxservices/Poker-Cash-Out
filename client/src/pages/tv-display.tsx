
import { useState, useEffect, useCallback } from "react";
import { tvApiClient, TVGameState } from "@/lib/tv-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Monitor, Wifi, WifiOff, RotateCcw, Trophy, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TVDisplay() {
  const [gameState, setGameState] = useState<TVGameState | null>(null);
  const [accessCode, setAccessCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [approvedCashouts, setApprovedCashouts] = useState<{[key: string]: { amount: number, timestamp: number }}>({});

  const connectToStream = useCallback((code: string) => {
    // Clean up existing connection
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
        
        // Check if this is a new hand (handId changed) - clear approved cashouts
        if (gameState && gameState.handId && data.handId !== gameState.handId) {
          setApprovedCashouts({});
        }
        
        setGameState(data);
        setLastUpdate(new Date());
        console.log('TV Display: Received game state update:', data);
      } catch (error) {
        console.error('TV Display: Error parsing game state:', error);
      }
    };

    newEventSource.onerror = (error) => {
      console.error('TV Display: EventSource error:', error);
      setIsConnected(false);
      setConnectionStatus('error');
      
      // Auto-reconnect after 3 seconds
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
      <div className="w-12 h-16 bg-white rounded-lg flex flex-col items-center justify-center shadow-lg border-2 border-gray-300">
        <div className={cn(
          "text-sm font-bold",
          isRedSuit(card.suit) ? "text-red-600" : "text-black"
        )}>
          {card.rank}
        </div>
        <div className={cn(
          "text-lg",
          isRedSuit(card.suit) ? "text-red-600" : "text-black"
        )}>
          {card.suit}
        </div>
      </div>
    );
  };

  const renderCommunityCards = () => {
    if (!gameState?.communityCards) return null;
    
    const { flop, turn, river } = gameState.communityCards;
    const allCommunityCards = [...(flop || [])];
    if (turn) allCommunityCards.push(turn);
    if (river) allCommunityCards.push(river);
    
    if (allCommunityCards.length === 0) return null;
    
    return (
      <Card className="p-4 bg-gray-800/90 backdrop-blur border-gray-700">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-3">Community Cards</h3>
          <div className="flex justify-center gap-2">
            {allCommunityCards.map((card, index) => (
              <div key={index}>
                {renderCard(card)}
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  // Get real cashout status from game state
  const getCashoutStatus = (playerNumber: number) => {
    if (!gameState) return null;
    
    if (playerNumber === 1) {
      return gameState.player1CashoutStatus;
    } else {
      return gameState.player2CashoutStatus;
    }
  };

  // Handle when cashout gets approved - store for animation
  useEffect(() => {
    if (gameState) {
      // Check if player 1 cashout was just approved
      if (gameState.player1CashoutStatus === 'approved' && !approvedCashouts.player1) {
        setApprovedCashouts(prev => ({
          ...prev,
          player1: { amount: gameState.player1MoneyEquity || 0, timestamp: Date.now() }
        }));
      }
      
      // Check if player 2 cashout was just approved
      if (gameState.player2CashoutStatus === 'approved' && !approvedCashouts.player2) {
        setApprovedCashouts(prev => ({
          ...prev,
          player2: { amount: gameState.player2MoneyEquity || 0, timestamp: Date.now() }
        }));
      }
    }
  }, [gameState?.player1CashoutStatus, gameState?.player2CashoutStatus, approvedCashouts]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 bg-gray-800/90 backdrop-blur border-gray-700">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Monitor className="h-16 w-16 text-blue-400" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">TV Display</h1>
              <p className="text-gray-300">Enter access code to connect</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="accessCode" className="text-white">Access Code</Label>
                <Input
                  id="accessCode"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest bg-gray-700 border-gray-600 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                />
              </div>

              <Button 
                onClick={handleConnect} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={connectionStatus === 'connecting' || inputCode.length !== 6}
              >
                {connectionStatus === 'connecting' ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>

              {connectionStatus === 'error' && (
                <p className="text-red-400 text-sm text-center">
                  Connection failed. Check your access code and try again.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <Monitor className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Live Poker Display</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-green-600/20 border-green-600 text-green-400">
            <Wifi className="h-4 w-4 mr-1" />
            Connected: {accessCode}
          </Badge>
          <Button onClick={handleDisconnect} variant="outline" size="sm">
            Disconnect
          </Button>
        </div>
      </div>

      {gameState ? (
        <div className="space-y-6">
          {/* Pot Amount - Main Display */}
          <Card className="p-6 bg-gray-800/90 backdrop-blur border-gray-700">
            <div className="text-center">
              <p className="text-gray-300 text-lg mb-2">Current Pot</p>
              <p className="text-5xl font-bold text-yellow-400 mb-3">
                {formatCurrency(gameState.potAmount)}
              </p>
              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                {gameState.gameVariant.toUpperCase()}
              </Badge>
            </div>
          </Card>

          {/* Community Cards */}
          {renderCommunityCards()}

          {/* Players Display */}
          {gameState.player1Equity !== null && gameState.player2Equity !== null && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Player 1 */}
              <Card className="p-4 bg-gray-800/90 backdrop-blur border-gray-700">
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-semibold text-white">Player 1</h3>
                  
                  {/* Player Hand Cards */}
                  {gameState.player1Hand && gameState.player1Hand.length > 0 && (
                    <div className="flex justify-center gap-2 mb-3">
                      {gameState.player1Hand.map((card: any, index: number) => (
                        <div key={index}>
                          {renderCard(card)}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Equity */}
                  <div className="bg-green-600/20 border border-green-500 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-400 mb-1">
                      {formatPercentage(gameState.player1Equity)}
                    </p>
                    <p className="text-sm text-gray-300">Equity</p>
                  </div>
                  
                  {/* Cashout Amount - The King */}
                  <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-4">
                    <p className="text-xs text-gray-300 mb-1">CASHOUT AMOUNT</p>
                    <p className="text-3xl font-bold text-yellow-400">
                      {gameState.player1MoneyEquity ? formatCurrency(gameState.player1MoneyEquity) : '$0'}
                    </p>
                  </div>
                  
                  {/* Cashout Status Display */}
                  {getCashoutStatus(1) === 'pending' && (
                    <div className="bg-orange-600/20 border border-orange-500 rounded-lg p-3">
                      <div className="text-center">
                        <Clock className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                        <div className="text-orange-400 font-bold text-lg mb-1">
                          CASHOUT PENDING
                        </div>
                        <div className="text-sm text-gray-300">
                          Awaiting approval...
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {getCashoutStatus(1) === 'approved' && (
                    <div className="cashout-animation bg-green-600/30 border border-green-400 rounded-lg p-4">
                      <div className="trophy-bounce text-center">
                        <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                        <div className="text-green-400 font-bold text-lg mb-1">
                          CASHOUT APPROVED!
                        </div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {formatCurrency(approvedCashouts.player1?.amount || gameState.player1MoneyEquity || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {getCashoutStatus(1) === 'rejected' && (
                    <div className="bg-red-600/20 border border-red-500 rounded-lg p-3">
                      <div className="text-center">
                        <X className="h-6 w-6 text-red-400 mx-auto mb-2" />
                        <div className="text-red-400 font-bold text-lg mb-1">
                          CASHOUT REJECTED
                        </div>
                        <div className="text-sm text-gray-300">
                          Player continues in hand
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Player 2 */}
              <Card className="p-4 bg-gray-800/90 backdrop-blur border-gray-700">
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-semibold text-white">Player 2</h3>
                  
                  {/* Player Hand Cards */}
                  {gameState.player2Hand && gameState.player2Hand.length > 0 && (
                    <div className="flex justify-center gap-2 mb-3">
                      {gameState.player2Hand.map((card: any, index: number) => (
                        <div key={index}>
                          {renderCard(card)}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Equity */}
                  <div className="bg-red-600/20 border border-red-500 rounded-lg p-3">
                    <p className="text-2xl font-bold text-red-400 mb-1">
                      {formatPercentage(gameState.player2Equity)}
                    </p>
                    <p className="text-sm text-gray-300">Equity</p>
                  </div>
                  
                  {/* Cashout Amount - The King */}
                  <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-4">
                    <p className="text-xs text-gray-300 mb-1">CASHOUT AMOUNT</p>
                    <p className="text-3xl font-bold text-yellow-400">
                      {gameState.player2MoneyEquity ? formatCurrency(gameState.player2MoneyEquity) : '$0'}
                    </p>
                  </div>
                  
                  {/* Cashout Status Display */}
                  {getCashoutStatus(2) === 'pending' && (
                    <div className="bg-orange-600/20 border border-orange-500 rounded-lg p-3">
                      <div className="text-center">
                        <Clock className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                        <div className="text-orange-400 font-bold text-lg mb-1">
                          CASHOUT PENDING
                        </div>
                        <div className="text-sm text-gray-300">
                          Awaiting approval...
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {getCashoutStatus(2) === 'approved' && (
                    <div className="cashout-animation bg-green-600/30 border border-green-400 rounded-lg p-4">
                      <div className="trophy-bounce text-center">
                        <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                        <div className="text-green-400 font-bold text-lg mb-1">
                          CASHOUT APPROVED!
                        </div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {formatCurrency(approvedCashouts.player2?.amount || gameState.player2MoneyEquity || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {getCashoutStatus(2) === 'rejected' && (
                    <div className="bg-red-600/20 border border-red-500 rounded-lg p-3">
                      <div className="text-center">
                        <X className="h-6 w-6 text-red-400 mx-auto mb-2" />
                        <div className="text-red-400 font-bold text-lg mb-1">
                          CASHOUT REJECTED
                        </div>
                        <div className="text-sm text-gray-300">
                          Player continues in hand
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Status Footer */}
          <div className="text-center text-gray-400 text-sm">
            {lastUpdate && (
              <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
            )}
            {gameState.handId && (
              <p>Hand ID: {gameState.handId}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Placeholder Pot Display */}
          <Card className="p-6 bg-gray-800/90 backdrop-blur border-gray-700">
            <div className="text-center">
              <p className="text-gray-300 text-lg mb-2">Current Pot</p>
              <p className="text-5xl font-bold text-gray-500 mb-3">
                $--,---
              </p>
              <Badge variant="secondary" className="bg-gray-700 text-gray-400">
                WAITING...
              </Badge>
            </div>
          </Card>

          {/* Placeholder Community Cards */}
          <Card className="p-4 bg-gray-800/90 backdrop-blur border-gray-700">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-3">Community Cards</h3>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((index) => (
                  <div key={index} className="w-12 h-16 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-600 border-dashed">
                    <div className="text-gray-500 text-xs">?</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Placeholder Players */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Placeholder */}
            <Card className="p-4 bg-gray-800/90 backdrop-blur border-gray-700">
              <div className="text-center space-y-3">
                <h3 className="text-xl font-semibold text-white">Player 1</h3>
                
                {/* Placeholder Hand Cards */}
                <div className="flex justify-center gap-2 mb-3">
                  {[1, 2].map((index) => (
                    <div key={index} className="w-12 h-16 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-600 border-dashed">
                      <div className="text-gray-500 text-xs">?</div>
                    </div>
                  ))}
                </div>
                
                {/* Placeholder Equity */}
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-500 mb-1">
                    --.-%
                  </p>
                  <p className="text-sm text-gray-400">Equity</p>
                </div>
                
                {/* Placeholder Cashout Amount */}
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">CASHOUT AMOUNT</p>
                  <p className="text-3xl font-bold text-gray-500">
                    $--,---
                  </p>
                </div>
              </div>
            </Card>

            {/* Player 2 Placeholder */}
            <Card className="p-4 bg-gray-800/90 backdrop-blur border-gray-700">
              <div className="text-center space-y-3">
                <h3 className="text-xl font-semibold text-white">Player 2</h3>
                
                {/* Placeholder Hand Cards */}
                <div className="flex justify-center gap-2 mb-3">
                  {[1, 2].map((index) => (
                    <div key={index} className="w-12 h-16 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-600 border-dashed">
                      <div className="text-gray-500 text-xs">?</div>
                    </div>
                  ))}
                </div>
                
                {/* Placeholder Equity */}
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-500 mb-1">
                    --.-%
                  </p>
                  <p className="text-sm text-gray-400">Equity</p>
                </div>
                
                {/* Placeholder Cashout Amount */}
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">CASHOUT AMOUNT</p>
                  <p className="text-3xl font-bold text-gray-500">
                    $--,---
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Placeholder Status */}
          <Card className="p-8 bg-gray-800/90 backdrop-blur border-gray-700">
            <div className="text-center text-gray-400">
              <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-semibold mb-2">Waiting for poker data...</p>
              <p className="text-sm">Connect from the poker calculator to see live updates</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
