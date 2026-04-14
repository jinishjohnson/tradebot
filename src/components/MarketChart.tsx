import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface MarketChartProps {
  data: any[];
  symbol: string;
}

export function MarketChart({ data, symbol }: MarketChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] w-full mt-4 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 flex items-center justify-center">
        <p className="text-sm text-zinc-500 italic">No historical data available for {symbol}</p>
      </div>
    );
  }

  const formattedData = data
    .filter((d) => d.date && d.close !== undefined)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString(),
      price: d.close,
    }));

  if (formattedData.length === 0) {
    return (
      <div className="h-[300px] w-full mt-4 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 flex items-center justify-center">
        <p className="text-sm text-zinc-500 italic">No valid price data available for {symbol}</p>
      </div>
    );
  }

  const prices = formattedData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = maxPrice === minPrice ? 10 : (maxPrice - minPrice) * 0.1;

  return (
    <div className="h-[300px] w-full mt-4 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-zinc-400">{symbol} Performance (7D)</h3>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#71717a"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#71717a"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            domain={[minPrice - padding, maxPrice + padding]}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            itemStyle={{ color: "#10b981" }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPrice)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
