import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { equityCalculationSchema } from "@shared/schema";
import { calculateEquity } from "./lib/monte-carlo";

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
        20000,
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

  const httpServer = createServer(app);
  return httpServer;
}
