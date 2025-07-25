
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
  private lastData: TVBroadcastData | null = null;
  private pollInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === TV_BROADCAST_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue) as TVBroadcastData;
          console.log('TVBroadcaster: Received storage event:', data);
          this.lastData = data;
          this.notifyListeners(data);
        } catch (error) {
          console.error('Failed to parse TV broadcast data:', error);
        }
      }
    });

    // Listen for events within the same tab
    window.addEventListener('tv-broadcast', ((e: CustomEvent<TVBroadcastData>) => {
      console.log('TVBroadcaster: Received custom event:', e.detail);
      this.lastData = e.detail;
      this.notifyListeners(e.detail);
    }) as EventListener);

    // Start polling as fallback (especially useful in fullscreen)
    this.startPolling();

    // Listen for fullscreen changes to adjust polling frequency
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        this.startPolling(500); // More frequent polling in fullscreen
      } else {
        this.startPolling(2000); // Less frequent when not fullscreen
      }
    });
  }

  private startPolling(interval: number = 2000) {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(() => {
      const stored = localStorage.getItem(TV_BROADCAST_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored) as TVBroadcastData;
          // Only notify if data has changed
          if (!this.lastData || data.timestamp > this.lastData.timestamp) {
            this.lastData = data;
            this.notifyListeners(data);
          }
        } catch (error) {
          console.error('Failed to parse stored TV broadcast data during polling:', error);
        }
      }
    }, interval);
  }

  static getInstance(): TVBroadcaster {
    if (!TVBroadcaster.instance) {
      TVBroadcaster.instance = new TVBroadcaster();
    }
    return TVBroadcaster.instance;
  }

  broadcast(data: TVBroadcastData) {
    data.timestamp = Date.now();
    console.log('TVBroadcaster: Broadcasting data:', data);
    
    // Store in localStorage for cross-tab communication
    localStorage.setItem(TV_BROADCAST_KEY, JSON.stringify(data));
    
    // Always dispatch custom event for same-tab communication
    // This ensures updates work even when both calculator and TV are in same tab/window
    const event = new CustomEvent('tv-broadcast', { detail: data });
    window.dispatchEvent(event);
    
    // Force immediate notification to current listeners
    this.lastData = data;
    this.notifyListeners(data);
  }

  subscribe(callback: (data: TVBroadcastData) => void) {
    this.listeners.push(callback);
    
    // Send current data if available
    const stored = localStorage.getItem(TV_BROADCAST_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as TVBroadcastData;
        this.lastData = data;
        callback(data);
      } catch (error) {
        console.error('Failed to parse stored TV broadcast data:', error);
      }
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.listeners = [];
  }

  private notifyListeners(data: TVBroadcastData) {
    console.log(`TVBroadcaster: Notifying ${this.listeners.length} listeners with data:`, data);
    this.listeners.forEach((listener, index) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`TV broadcast listener ${index} error:`, error);
      }
    });
  }
}

export const tvBroadcaster = TVBroadcaster.getInstance();
