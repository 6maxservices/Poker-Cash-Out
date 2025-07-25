
import { useState, useEffect, useCallback } from "react";
import { tvApiClient, TVGameState } from "@/lib/tv-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Monitor, Wifi, WifiOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TVDisplay() {
  const [gameState, setGameState] = useState<TVGameState | null>(null);
  const [accessCode, setAccessCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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
        <div className="space-y-8">
          {/* Pot Amount - Main Display */}
          <Card className="p-8 bg-gray-800/90 backdrop-blur border-gray-700">
            <div className="text-center">
              <p className="text-gray-300 text-xl mb-2">Current Pot</p>
              <p className="text-6xl font-bold text-yellow-400 mb-4">
                {formatCurrency(gameState.potAmount)}
              </p>
              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                {gameState.gameVariant.toUpperCase()}
              </Badge>
            </div>
          </Card>

          {/* Equity Display */}
          {gameState.player1Equity !== null && gameState.player2Equity !== null && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 bg-gray-800/90 backdrop-blur border-gray-700">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-4">Player 1</h3>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-green-400">
                      {formatPercentage(gameState.player1Equity)}
                    </p>
                    <p className="text-lg text-gray-300">
                      {gameState.player1MoneyEquity ? formatCurrency(gameState.player1MoneyEquity) : ''}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gray-800/90 backdrop-blur border-gray-700">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-4">Player 2</h3>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-red-400">
                      {formatPercentage(gameState.player2Equity)}
                    </p>
                    <p className="text-lg text-gray-300">
                      {gameState.player2MoneyEquity ? formatCurrency(gameState.player2MoneyEquity) : ''}
                    </p>
                  </div>
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
        <Card className="p-12 bg-gray-800/90 backdrop-blur border-gray-700">
          <div className="text-center text-gray-400">
            <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">Waiting for poker data...</p>
            <p className="text-sm mt-2">Start a calculation to see live updates</p>
          </div>
        </Card>
      )}
    </div>
  );
}
