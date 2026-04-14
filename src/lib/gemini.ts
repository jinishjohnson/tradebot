import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getMarketDataFunction: FunctionDeclaration = {
  name: "getMarketData",
  description: "Get current market price and historical data for a stock symbol",
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description: "The stock ticker symbol (e.g., AAPL, TSLA, BTC-USD)",
      },
    },
    required: ["symbol"],
  },
};

export const executeTradeFunction: FunctionDeclaration = {
  name: "executeTrade",
  description: "Execute a buy or sell trade for a stock symbol",
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description: "The stock ticker symbol",
      },
      quantity: {
        type: Type.NUMBER,
        description: "The number of shares to trade",
      },
      side: {
        type: Type.STRING,
        enum: ["buy", "sell"],
        description: "Whether to buy or sell",
      },
    },
    required: ["symbol", "quantity", "side"],
  },
};

export const searchSymbolFunction: FunctionDeclaration = {
  name: "searchSymbol",
  description: "Search for a stock ticker symbol by company name",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The company name or search query",
      },
    },
    required: ["query"],
  },
};

export const getPortfolioFunction: FunctionDeclaration = {
  name: "getPortfolio",
  description: "Get the current virtual portfolio balance and positions",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const systemInstruction = `You are TradeMind AI, a professional stock trading assistant.
Your goal is to help users analyze market data, search for stocks, and execute simulated trades.

RESPONSE FORMATTING RULES:
You MUST structure your responses using the following sections when applicable:

1. [MARKET_DATA]
Use this section to provide raw data, price summaries, and technical analysis.
[/MARKET_DATA]

2. [TRADING_SUGGESTION]
Use this section to provide specific buy/sell recommendations or strategy advice.
[/TRADING_SUGGESTION]

3. [CHAT_MESSAGE]
Use this section for general conversation, greetings, and explaining your actions.
[/CHAT_MESSAGE]

Example:
[CHAT_MESSAGE]I've analyzed AAPL for you.[/CHAT_MESSAGE]
[MARKET_DATA]AAPL is currently trading at $150.25, up 2% today.[/MARKET_DATA]
[TRADING_SUGGESTION]Based on the upward trend, it might be a good time to buy.[/TRADING_SUGGESTION]

Guidelines:
1. Always be professional and data-driven.
2. When asked for market data, use getMarketData.
3. When a user wants to trade, use executeTrade.
4. Before executing a trade, summarize the current price and total cost/proceeds.
5. If a user is unsure of a ticker, use searchSymbol.
6. Remind users that this is a SIMULATION and not real financial advice.
7. Use getPortfolio to show the user their current holdings when relevant.

Risk Check:
- If a user tries to buy more than they can afford, the tool will return an error. Explain this to the user.
- If a user tries to sell more than they own, the tool will return an error. Explain this to the user.`;

export async function chatWithAI(messages: any[]) {
  const model = "gemini-3-flash-preview";
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: messages,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [getMarketDataFunction, executeTradeFunction, searchSymbolFunction, getPortfolioFunction] }],
      },
    });
    return response;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
