import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { equityCalculationSchema } from "@shared/schema";
import { calculateEquity } from "./lib/monte-carlo";
import { tvBroadcastManager } from "./lib/tv-broadcast";

export async function registerRoutes(app: Express): Promise<Server> {
  // Calculate poker equity
  app.post("/api/calculate-equity", async (req, res) => {
    try {
      const calculationData = equityCalculationSchema.parse(req.body);
      
      const result = calculateEquity(
        calculationData.gameVariant,
        calculationData.communityCards,
        calculationData.player1Hand,
        calculationData.player2Hand,
        calculationData.potAmount,
        calculationData.gameVariant === 'nlh' ? 5000 : 2500,
        calculationData.burnedCards || []
      );

      // Result calculated successfully

      // Optionally save the calculation
      const calculationId = await storage.saveCalculation(calculationData, result);

      res.json({ ...result, calculationId });
    } catch (error) {
      console.error("Error calculating equity:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to calculate equity" 
      });
    }
  });

  // Get saved calculation
  app.get("/api/calculation/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const calculation = await storage.getCalculation(id);
      
      if (!calculation) {
        return res.status(404).json({ message: "Calculation not found" });
      }

      res.json(calculation);
    } catch (error) {
      console.error("Error retrieving calculation:", error);
      res.status(500).json({ message: "Failed to retrieve calculation" });
    }
  });

  // Get recent calculations
  app.get("/api/calculations/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const calculations = await storage.getRecentCalculations(limit);
      res.json(calculations);
    } catch (error) {
      console.error("Error retrieving recent calculations:", error);
      res.status(500).json({ message: "Failed to retrieve recent calculations" });
    }
  });

  // TV Broadcast Routes
  
  // Get access code for TV displays
  app.get("/api/tv/access-code", (req, res) => {
    res.json({ 
      accessCode: tvBroadcastManager.getAccessCode(),
      connectedClients: tvBroadcastManager.getConnectedClientsCount()
    });
  });

  // Regenerate access code
  app.post("/api/tv/regenerate-code", (req, res) => {
    const newCode = tvBroadcastManager.regenerateAccessCode();
    res.json({ accessCode: newCode });
  });

  // Update game state (called by poker calculator)
  app.post("/api/tv/update-game", (req, res) => {
    try {
      const gameData = req.body;
      tvBroadcastManager.updateGameState(gameData);
      res.json({ 
        success: true, 
        connectedClients: tvBroadcastManager.getConnectedClientsCount()
      });
    } catch (error) {
      console.error("Error updating TV game state:", error);
      res.status(400).json({ message: "Failed to update game state" });
    }
  });

  // Server-Sent Events endpoint for TV displays
  app.get("/api/tv/stream/:accessCode", (req, res) => {
    const { accessCode } = req.params;
    
    if (accessCode !== tvBroadcastManager.getAccessCode()) {
      return res.status(403).json({ message: "Invalid access code" });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial game state
    const initialState = tvBroadcastManager.getGameState();
    res.write(`data: ${JSON.stringify(initialState)}\n\n`);

    // Listen for game state updates
    const handleGameUpdate = (gameState: any) => {
      res.write(`data: ${JSON.stringify(gameState)}\n\n`);
    };

    tvBroadcastManager.on('gameStateUpdate', handleGameUpdate);

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
      tvBroadcastManager.removeListener('gameStateUpdate', handleGameUpdate);
      clearInterval(heartbeat);
      console.log('TV Display disconnected');
    });

    console.log('TV Display connected');
  });

  const httpServer = createServer(app);
  return httpServer;
}
