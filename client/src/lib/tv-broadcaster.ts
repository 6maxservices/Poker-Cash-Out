
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
  private lastProcessedTimestamp: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    console.log('TVBroadcaster: Constructor called');
    
    // Test if we can access localStorage
    try {
      const testKey = 'tv-broadcaster-test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      console.log('TVBroadcaster: localStorage access confirmed');
    } catch (error) {
      console.error('TVBroadcaster: localStorage access failed:', error);
    }
    
    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      console.log('TVBroadcaster: Storage event received:', e.key, e.newValue);
      if (e.key === TV_BROADCAST_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue) as TVBroadcastData;
          console.log('TVBroadcaster: Parsed storage data:', data);
          this.lastData = data;
          this.notifyListeners(data);
        } catch (error) {
          console.error('TVBroadcaster: Failed to parse storage data:', error);
        }
      }
    });

    // Listen for events within the same tab
    window.addEventListener('tv-broadcast', ((e: CustomEvent<TVBroadcastData>) => {
      console.log('TVBroadcaster: Received custom event:', e.detail);
      this.lastData = e.detail;
      this.notifyListeners(e.detail);
    }) as EventListener);
    
    // Add polling fallback for cross-tab communication
    this.startPolling();
    
    console.log('TVBroadcaster: All event listeners registered');
  }

  static getInstance(): TVBroadcaster {
    if (!TVBroadcaster.instance) {
      console.log('TVBroadcaster: Creating new instance');
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
    
    console.log('TVBroadcaster: Broadcast complete');
  }

  subscribe(callback: (data: TVBroadcastData) => void) {
    console.log('TVBroadcaster: New subscriber added, total:', this.listeners.length + 1);
    this.listeners.push(callback);
    
    // Send current data if available and initialize timestamp tracking
    const stored = localStorage.getItem(TV_BROADCAST_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as TVBroadcastData;
        console.log('TVBroadcaster: Sending stored data to new subscriber:', data);
        console.log('TVBroadcaster: Setting initial timestamp to:', data.timestamp);
        this.lastProcessedTimestamp = data.timestamp;
        callback(data);
      } catch (error) {
        console.error('Failed to parse stored TV broadcast data:', error);
      }
    } else {
      // If no stored data, set timestamp to 0 so any new data will be processed
      this.lastProcessedTimestamp = 0;
      console.log('TVBroadcaster: No stored data, setting timestamp to 0');
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      console.log('TVBroadcaster: Subscriber removed, total:', this.listeners.length);
      
      // Stop polling if no more listeners
      if (this.listeners.length === 0) {
        this.stopPolling();
      }
    };
  }

  private notifyListeners(data: TVBroadcastData) {
    console.log(`TVBroadcaster: Notifying ${this.listeners.length} listeners with data:`, data);
    this.listeners.forEach((listener, index) => {
      try {
        console.log(`TVBroadcaster: Calling listener ${index}`);
        listener(data);
      } catch (error) {
        console.error(`TV broadcast listener ${index} error:`, error);
      }
    });
  }

  // Start polling for localStorage changes (fallback for cross-tab communication)
  private startPolling() {
    if (this.pollingInterval) return;
    
    this.pollingInterval = setInterval(() => {
      try {
        const stored = localStorage.getItem(TV_BROADCAST_KEY);
        if (stored && this.listeners.length > 0) {
          const data = JSON.parse(stored) as TVBroadcastData;
          
          // Always process if timestamp is different (newer OR older, in case of clock differences)
          // This ensures we catch updates even if there are timestamp inconsistencies
          if (data.timestamp !== this.lastProcessedTimestamp) {
            console.log('TVBroadcaster: Polling detected data change:', {
              old: this.lastProcessedTimestamp,
              new: data.timestamp,
              data: data
            });
            this.lastProcessedTimestamp = data.timestamp;
            this.lastData = data;
            this.notifyListeners(data);
          }
        }
      } catch (error) {
        console.error('TVBroadcaster: Polling error:', error);
      }
    }, 100); // Poll every 100ms
    
    console.log('TVBroadcaster: Started polling for cross-tab updates');
  }

  // Stop polling
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('TVBroadcaster: Stopped polling');
    }
  }

  // Debug method to check listener count
  getListenerCount(): number {
    return this.listeners.length;
  }
}

// Create and export the singleton instance
console.log('TVBroadcaster: Creating singleton instance');
export const tvBroadcaster = TVBroadcaster.getInstance();
console.log('TVBroadcaster: Singleton instance created');
