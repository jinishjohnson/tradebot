import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import YahooFinance from "yahoo-finance2";

// @ts-ignore
const yahooFinance = new YahooFinance();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/market/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      if (!symbol) return res.status(400).json({ error: "Symbol is required" });

      const quote = await yahooFinance.quote(symbol) as any;
      
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      
      let history: any[] = [];
      try {
        // Use chart API as primary as it's often more robust in v3
        const chartData = await yahooFinance.chart(symbol, {
          period1: sevenDaysAgo,
          period2: now,
          interval: "1d",
        });
        
        if (chartData && chartData.quotes) {
          history = chartData.quotes
            .filter((q: any) => q.date && q.close !== null)
            .map((q: any) => ({
              date: q.date,
              close: q.close,
              high: q.high,
              low: q.low,
              open: q.open,
              volume: q.volume
            }));
        }
      } catch (chartError: any) {
        console.warn("Chart API failed, trying historical API:", chartError.message);
        try {
          history = await yahooFinance.historical(symbol, {
            period1: sevenDaysAgo,
            period2: now,
            interval: "1d",
          });
        } catch (histError: any) {
          console.error("Both Chart and Historical APIs failed");
          throw histError;
        }
      }

      res.json({ quote, history });
    } catch (error: any) {
      console.error("Error fetching market data:", error);
      if (error.name === "InvalidOptionsError" && error.subErrors) {
        console.error("Sub-errors:", JSON.stringify(error.subErrors, null, 2));
      }
      res.status(500).json({ 
        error: "Failed to fetch market data", 
        details: error.message,
        symbol: req.params.symbol 
      });
    }
  });

  app.get("/api/price/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const quote = await yahooFinance.quote(symbol) as any;
      res.json({ 
        symbol, 
        price: quote.regularMarketPrice, 
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        time: new Date()
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  app.get("/api/search/:query", async (req, res) => {
    try {
      const { query } = req.params;
      const results = await yahooFinance.search(query);
      res.json(results);
    } catch (error) {
      console.error("Error searching symbols:", error);
      res.status(500).json({ error: "Failed to search symbols" });
    }
  });

  // Mock Trading Execution (Simulation)
  // In a real app, this would connect to Alpaca, Robinhood, etc.
  let virtualPortfolio = {
    balance: 100000, // $100k starting
    positions: {} as Record<string, { quantity: number; avgPrice: number }>,
    history: [] as any[],
  };

  app.get("/api/portfolio", (req, res) => {
    res.json(virtualPortfolio);
  });

  app.post("/api/trade", async (req, res) => {
    const { symbol, quantity, side } = req.body; // side: 'buy' | 'sell'
    try {
      const quote = await yahooFinance.quote(symbol) as any;
      const price = quote.regularMarketPrice || 0;
      const totalCost = price * quantity;

      if (side === "buy") {
        if (virtualPortfolio.balance < totalCost) {
          return res.status(400).json({ error: "Insufficient funds" });
        }
        virtualPortfolio.balance -= totalCost;
        const currentPos = virtualPortfolio.positions[symbol] || { quantity: 0, avgPrice: 0 };
        const newQuantity = currentPos.quantity + quantity;
        const newAvgPrice = (currentPos.avgPrice * currentPos.quantity + totalCost) / newQuantity;
        virtualPortfolio.positions[symbol] = { quantity: newQuantity, avgPrice: newAvgPrice };
      } else if (side === "sell") {
        const currentPos = virtualPortfolio.positions[symbol];
        if (!currentPos || currentPos.quantity < quantity) {
          return res.status(400).json({ error: "Insufficient shares" });
        }
        virtualPortfolio.balance += totalCost;
        currentPos.quantity -= quantity;
        if (currentPos.quantity === 0) {
          delete virtualPortfolio.positions[symbol];
        }
      }

      const trade = {
        symbol,
        quantity,
        price,
        side,
        timestamp: new Date(),
      };
      virtualPortfolio.history.push(trade);

      res.json({ success: true, trade, portfolio: virtualPortfolio });
    } catch (error) {
      res.status(500).json({ error: "Trade execution failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
