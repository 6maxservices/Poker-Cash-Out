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
  private static instance: TVBroadcaster | null = null;
  private listeners: ((data: TVBroadcastData) => void)[] = [];
  private lastProcessedTimestamp: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    console.log('TVBroadcaster: Constructor called');
    this.startPolling();
  }

  static getInstance(): TVBroadcaster {
    if (!TVBroadcaster.instance) {
      console.log('TVBroadcaster: Creating new singleton instance');
      TVBroadcaster.instance = new TVBroadcaster();
    }
    return TVBroadcaster.instance;
  }

  broadcast(data: TVBroadcastData) {
    data.timestamp = Date.now();
    console.log('TVBroadcaster: Broadcasting data with timestamp:', data.timestamp, 'pot:', data.potAmount);

    try {
      localStorage.setItem(TV_BROADCAST_KEY, JSON.stringify(data));
      console.log('TVBroadcaster: Data written to localStorage successfully');
    } catch (error) {
      console.error('TVBroadcaster: Failed to write to localStorage:', error);
    }
  }

  subscribe(callback: (data: TVBroadcastData) => void) {
    console.log('TVBroadcaster: Adding subscriber, total will be:', this.listeners.length + 1);
    this.listeners.push(callback);

    // Send existing data immediately if available
    const stored = localStorage.getItem(TV_BROADCAST_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as TVBroadcastData;
        console.log('TVBroadcaster: Sending existing data to new subscriber:', data.timestamp, 'pot:', data.potAmount);
        this.lastProcessedTimestamp = data.timestamp;
        callback(data);
      } catch (error) {
        console.error('TVBroadcaster: Failed to parse existing data:', error);
      }
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      console.log('TVBroadcaster: Subscriber removed, total:', this.listeners.length);
    };
  }

  private startPolling() {
    if (this.pollingInterval) return;

    console.log('TVBroadcaster: Starting aggressive polling for cross-tab updates');

    this.pollingInterval = setInterval(() => {
      try {
        const stored = localStorage.getItem(TV_BROADCAST_KEY);
        if (stored && this.listeners.length > 0) {
          const data = JSON.parse(stored) as TVBroadcastData;

          if (data.timestamp !== this.lastProcessedTimestamp) {
            console.log('TVBroadcaster: *** POLLING DETECTED CHANGE ***');
            console.log('TVBroadcaster: Old timestamp:', this.lastProcessedTimestamp);
            console.log('TVBroadcaster: New timestamp:', data.timestamp);
            console.log('TVBroadcaster: New pot amount:', data.potAmount);
            console.log('TVBroadcaster: Listeners count:', this.listeners.length);

            this.lastProcessedTimestamp = data.timestamp;

            this.listeners.forEach((listener, index) => {
              try {
                console.log(`TVBroadcaster: Notifying listener ${index}`);
                listener(data);
              } catch (error) {
                console.error(`TVBroadcaster: Listener ${index} error:`, error);
              }
            });
          }
        }
      } catch (error) {
        console.error('TVBroadcaster: Polling error:', error);
      }
    }, 50); // Very aggressive polling - every 50ms
  }

  getListenerCount(): number {
    return this.listeners.length;
  }
}

// DO NOT create singleton at module level - this breaks cross-tab communication
// Instead, export a function that creates it on demand
export function getTVBroadcaster(): TVBroadcaster {
  return TVBroadcaster.getInstance();
}

// For backward compatibility, but this will be created lazily
let _instance: TVBroadcaster | null = null;
export const tvBroadcaster = new Proxy({} as TVBroadcaster, {
  get(target, prop) {
    if (!_instance) {
      _instance = TVBroadcaster.getInstance();
    }
    return (_instance as any)[prop];
  }
});