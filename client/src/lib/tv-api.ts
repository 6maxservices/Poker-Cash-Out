
export interface TVGameState {
  potAmount: number;
  gameVariant: 'nlh' | 'plo4' | 'plo5';
  handId: string | null;
  player1Equity: number | null;
  player2Equity: number | null;
  player1MoneyEquity: number | null;
  player2MoneyEquity: number | null;
  player1Hand: any[] | null;
  player2Hand: any[] | null;
  player1CashoutStatus: 'pending' | 'approved' | 'rejected' | null;
  player2CashoutStatus: 'pending' | 'approved' | 'rejected' | null;
  communityCards: {
    flop: any[];
    turn: any;
    river: any;
  };
  lastUpdated: number;
}

export class TVApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = window.location.origin;
  }

  async getAccessCode(): Promise<{ accessCode: string; connectedClients: number }> {
    const response = await fetch(`${this.baseUrl}/api/tv/access-code`);
    if (!response.ok) throw new Error('Failed to get access code');
    return response.json();
  }

  async regenerateAccessCode(): Promise<{ accessCode: string }> {
    const response = await fetch(`${this.baseUrl}/api/tv/regenerate-code`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to regenerate access code');
    return response.json();
  }

  async updateGameState(gameData: Partial<TVGameState>): Promise<{ success: boolean; connectedClients: number }> {
    const response = await fetch(`${this.baseUrl}/api/tv/update-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameData)
    });
    if (!response.ok) throw new Error('Failed to update game state');
    return response.json();
  }

  createEventSource(accessCode: string): EventSource {
    return new EventSource(`${this.baseUrl}/api/tv/stream/${accessCode}`);
  }
}

export const tvApiClient = new TVApiClient();
