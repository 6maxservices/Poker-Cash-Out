
import { Card, GameVariant } from "@shared/schema";

export interface TVBroadcastData {
  gameVariant: GameVariant;
  potAmount: number;
  player1Cards: Card[];
  player2Cards: Card[];
  player1Equity: number;
  player2Equity: number;
  player1CashoutAmount: number;
  player2CashoutAmount: number;
  player1CashoutStatus: 'pending' | 'approved' | 'rejected' | null;
  player2CashoutStatus: 'pending' | 'approved' | 'rejected' | null;
  timestamp: number;
}

const TV_BROADCAST_KEY = 'poker-tv-broadcast';

export class TVBroadcaster {
  private static instance: TVBroadcaster;
  private listeners: ((data: TVBroadcastData) => void)[] = [];

  private constructor() {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === TV_BROADCAST_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue) as TVBroadcastData;
          this.notifyListeners(data);
        } catch (error) {
          console.error('Failed to parse TV broadcast data:', error);
        }
      }
    });

    // Listen for events within the same tab
    window.addEventListener('tv-broadcast', ((e: CustomEvent<TVBroadcastData>) => {
      this.notifyListeners(e.detail);
    }) as EventListener);
  }

  static getInstance(): TVBroadcaster {
    if (!TVBroadcaster.instance) {
      TVBroadcaster.instance = new TVBroadcaster();
    }
    return TVBroadcaster.instance;
  }

  broadcast(data: TVBroadcastData) {
    data.timestamp = Date.now();
    
    // Store in localStorage for cross-tab communication
    localStorage.setItem(TV_BROADCAST_KEY, JSON.stringify(data));
    
    // Dispatch custom event for same-tab communication
    window.dispatchEvent(new CustomEvent('tv-broadcast', { detail: data }));
  }

  subscribe(callback: (data: TVBroadcastData) => void) {
    this.listeners.push(callback);
    
    // Send current data if available
    const stored = localStorage.getItem(TV_BROADCAST_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as TVBroadcastData;
        callback(data);
      } catch (error) {
        console.error('Failed to parse stored TV broadcast data:', error);
      }
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(data: TVBroadcastData) {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('TV broadcast listener error:', error);
      }
    });
  }
}

export const tvBroadcaster = TVBroadcaster.getInstance();
