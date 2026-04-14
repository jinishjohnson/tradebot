import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, User, TrendingUp, Wallet, Search, Loader2, RefreshCcw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { chatWithAI } from "@/src/lib/gemini";
import { MarketChart } from "./MarketChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "model";
  content: string;
  type?: "text" | "chart" | "portfolio" | "search";
  data?: any;
}

function RealTimeTicker() {
  const [prices, setPrices] = useState<any[]>([]);
  const symbols = ["AAPL", "TSLA", "BTC-USD", "NVDA", "AMZN"];

  useEffect(() => {
    const fetchPrices = async () => {
      const results = await Promise.all(
        symbols.map(async (s) => {
          try {
            const res = await fetch(`/api/price/${s}`);
            return await res.json();
          } catch {
            return null;
          }
        })
      );
      setPrices(results.filter(Boolean));
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900/80 border-b border-zinc-800 py-2 overflow-hidden whitespace-nowrap">
      <div className="flex gap-8 animate-marquee">
        {[...prices, ...prices].map((p, i) => (
          <div key={i} className="inline-flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-400 font-bold">{p.symbol}</span>
            <span className="text-zinc-100">${p.price?.toFixed(2)}</span>
            <span className={`flex items-center ${p.change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {p.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(p.changePercent)?.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormattedMessage({ content }: { content: string }) {
  const parseContent = (text: string) => {
    const sections = [];
    const regex = /\[(MARKET_DATA|TRADING_SUGGESTION|CHAT_MESSAGE)\]([\s\S]*?)\[\/\1\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add any text before the match as a general message if it exists
      if (match.index > lastIndex) {
        const preText = text.slice(lastIndex, match.index).trim();
        if (preText) sections.push({ type: "CHAT_MESSAGE", content: preText });
      }

      sections.push({ type: match[1], content: match[2].trim() });
      lastIndex = regex.lastIndex;
    }

    // Add remaining text if no tags were found or after the last tag
    if (lastIndex < text.length) {
      const postText = text.slice(lastIndex).trim();
      if (postText) {
        // If no sections were found at all, treat the whole thing as a CHAT_MESSAGE
        if (sections.length === 0) {
          sections.push({ type: "CHAT_MESSAGE", content: postText });
        } else {
          sections.push({ type: "CHAT_MESSAGE", content: postText });
        }
      }
    }

    return sections;
  };

  const sections = parseContent(content);

  return (
    <div className="flex flex-col gap-3 w-full">
      {sections.map((section, idx) => {
        switch (section.type) {
          case "MARKET_DATA":
            return (
              <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  <TrendingUp className="w-3 h-3" />
                  Market Analysis
                </div>
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </div>
              </div>
            );
          case "TRADING_SUGGESTION":
            return (
              <div key={idx} className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest">
                  <Bot className="w-3 h-3" />
                  Trading Suggestion
                </div>
                <div className="text-sm text-emerald-100/90 font-medium leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </div>
              </div>
            );
          default:
            return (
              <div key={idx} className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            );
        }
      })}
    </div>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "[CHAT_MESSAGE]Hello! I'm TradeMind AI. I can help you analyze stocks, search for symbols, and manage your virtual portfolio. What's on your mind today?[/CHAT_MESSAGE]",
    },
  ]);
  const [history, setHistory] = useState<any[]>([
    { role: "model", parts: [{ text: "[CHAT_MESSAGE]Hello! I'm TradeMind AI. I can help you analyze stocks, search for symbols, and manage your virtual portfolio. What's on your mind today?[/CHAT_MESSAGE]" }] }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("/api/portfolio");
      const data = await res.json();
      setPortfolio(data);
    } catch (error) {
      console.error("Failed to fetch portfolio");
    }
  };

  const handleToolCall = async (call: any) => {
    const { name, args } = call;
    
    try {
      if (name === "getMarketData") {
        const res = await fetch(`/api/market/${args.symbol}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return { data };
      }
      
      if (name === "executeTrade") {
        const res = await fetch("/api/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        fetchPortfolio();
        toast.success(`Successfully ${args.side}ed ${args.quantity} shares of ${args.symbol}`);
        return { data };
      }

      if (name === "searchSymbol") {
        const res = await fetch(`/api/search/${args.query}`);
        const data = await res.json();
        return { data };
      }

      if (name === "getPortfolio") {
        const res = await fetch("/api/portfolio");
        const data = await res.json();
        return { data };
      }
    } catch (error: any) {
      toast.error(error.message || "Action failed");
      return { error: error.message };
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    
    const newUserMsg: Message = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMsg]);
    
    const newUserHistory = { role: "user", parts: [{ text: userMessage }] };
    const updatedHistory = [...history, newUserHistory];
    setHistory(updatedHistory);
    
    setIsLoading(true);

    try {
      let currentHistory = [...updatedHistory];
      let response = await chatWithAI(currentHistory);
      
      // Handle potential tool calls
      let iterations = 0;
      const MAX_ITERATIONS = 5;

      while (response.functionCalls && iterations < MAX_ITERATIONS) {
        iterations++;
        // Add model's tool call to history
        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) {
          currentHistory.push(modelContent);
        }

        const toolResults = [];
        for (const call of response.functionCalls) {
          const result = await handleToolCall(call);
          toolResults.push({
            functionResponse: {
              name: call.name,
              response: result,
            },
          });

          // Add visual feedback for specific tools
          if (call.name === "getMarketData" && result.data) {
            setMessages((prev) => [
              ...prev,
              {
                role: "model",
                content: `Fetching data for ${call.args.symbol}...`,
                type: "chart",
                data: { symbol: call.args.symbol, history: result.data.history },
              },
            ]);
          }
        }

        // Add tool results to history
        const toolResponseContent = { role: "user", parts: toolResults };
        currentHistory.push(toolResponseContent);
        
        // Get next response from AI
        response = await chatWithAI(currentHistory);
      }

      if (response.text) {
        setMessages((prev) => [...prev, { role: "model", content: response.text }]);
        const finalContent = response.candidates?.[0]?.content;
        if (finalContent) {
          currentHistory.push(finalContent);
        }
      } else if (!response.functionCalls) {
        // If no text and no function calls, something might be wrong (e.g. safety filter)
        const fallbackMsg = "I'm sorry, I couldn't generate a response. Please try rephrasing your request.";
        setMessages((prev) => [...prev, { role: "model", content: fallbackMsg }]);
        currentHistory.push({ role: "model", parts: [{ text: fallbackMsg }] });
      }
      
      setHistory(currentHistory);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMsg = error.message || "An unexpected error occurred.";
      toast.error(`Chat Error: ${errorMsg}`);
      setMessages((prev) => [...prev, { role: "model", content: `Sorry, I encountered an error: ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 font-sans">
      {/* Header */}
      <header className="flex flex-col border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">TradeMind AI</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Live Simulation</span>
              </div>
            </div>
          </div>

          {portfolio && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Available Balance</span>
                <span className="text-sm font-mono font-medium text-emerald-400">
                  ${portfolio.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={fetchPortfolio} className="border-zinc-800 hover:bg-zinc-800">
                <RefreshCcw className="w-4 h-4 text-zinc-400" />
              </Button>
            </div>
          )}
        </div>
        <RealTimeTicker />
      </header>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-6 bg-black" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-zinc-800" : "bg-emerald-500/10 border border-emerald-500/20"
                }`}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : "w-full"}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-emerald-600 text-white rounded-tr-none shadow-lg shadow-emerald-900/20" 
                      : "bg-zinc-900 border border-zinc-800 rounded-tl-none w-full"
                  }`}>
                    {msg.role === "model" ? (
                      <FormattedMessage content={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                  
                  {msg.type === "chart" && msg.data && (
                    <MarketChart data={msg.data.history} symbol={msg.data.symbol} />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
              </div>
              <div className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-6 border-t border-zinc-800 bg-black backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a stock or execute a trade (e.g., 'Buy 10 shares of AAPL')"
            className="bg-zinc-900 border-zinc-800 h-14 pl-6 pr-16 rounded-2xl focus-visible:ring-emerald-500/50 transition-all"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 h-10 w-10 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <div className="max-w-3xl mx-auto mt-3 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {["Analyze AAPL", "Buy 5 TSLA", "Search for NVIDIA", "Show my portfolio"].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-full hover:bg-zinc-800 hover:text-zinc-300 transition-colors shrink-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
