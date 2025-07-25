
import { EventEmitter } from 'events';

export interface TVGameState {
  potAmount: number;
  gameVariant: 'nlh' | 'plo4' | 'plo5';
  handId: string | null;
  player1Equity: number | null;
  player2Equity: number | null;
  player1MoneyEquity: number | null;
  player2MoneyEquity: number | null;
  communityCards: {
    flop: any[];
    turn: any;
    river: any;
  };
  lastUpdated: number;
}

class TVBroadcastManager extends EventEmitter {
  private static instance: TVBroadcastManager;
  private gameState: TVGameState;
  private accessCode: string;

  private constructor() {
    super();
    this.gameState = {
      potAmount: 0,
      gameVariant: 'nlh',
      handId: null,
      player1Equity: null,
      player2Equity: null,
      player1MoneyEquity: null,
      player2MoneyEquity: null,
      communityCards: { flop: [], turn: null, river: null },
      lastUpdated: Date.now()
    };
    this.accessCode = this.generateAccessCode();
    console.log(`TV Broadcast: Access code generated: ${this.accessCode}`);
  }

  public static getInstance(): TVBroadcastManager {
    if (!TVBroadcastManager.instance) {
      TVBroadcastManager.instance = new TVBroadcastManager();
    }
    return TVBroadcastManager.instance;
  }

  private generateAccessCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  public getAccessCode(): string {
    return this.accessCode;
  }

  public regenerateAccessCode(): string {
    this.accessCode = this.generateAccessCode();
    console.log(`TV Broadcast: New access code generated: ${this.accessCode}`);
    return this.accessCode;
  }

  public updateGameState(updates: Partial<TVGameState>): void {
    this.gameState = {
      ...this.gameState,
      ...updates,
      lastUpdated: Date.now()
    };
    
    console.log('TV Broadcast: Game state updated:', {
      potAmount: this.gameState.potAmount,
      player1Equity: this.gameState.player1Equity,
      connectedClients: this.listenerCount('gameStateUpdate')
    });
    
    // Emit to all connected TV displays
    this.emit('gameStateUpdate', this.gameState);
  }

  public getGameState(): TVGameState {
    return { ...this.gameState };
  }

  public getConnectedClientsCount(): number {
    return this.listenerCount('gameStateUpdate');
  }
}

export const tvBroadcastManager = TVBroadcastManager.getInstance();
