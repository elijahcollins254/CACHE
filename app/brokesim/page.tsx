"use client";

import { useState, useMemo } from "react";
import { ChevronDown, RotateCcw, TrendingUp, DollarSign, Zap } from "lucide-react";

interface BrokerageState {
  // Customer volume
  dailyBetVolume: number; // Total KES wagered daily
  
  // Fee structure
  brokerTradingFeePercent: number; // What broker charges customers
  polymarketFeePercent: number; // What Polymarket charges
  
  // Price adjustment (spread)
  priceAdjustmentPercent: number; // How much to adjust prices up/down
}

interface MetricsResult {
  title: string;
  description: string;
  breakdown: { [key: string]: number | string };
}

const DEFAULTS = {
  dailyBetVolume: 50000,
  brokerTradingFeePercent: 2.5,
  polymarketFeePercent: 2.0,
  priceAdjustmentPercent: 0.5,
};

export default function BrokerSim() {
  const [state, setState] = useState<BrokerageState>({
    dailyBetVolume: DEFAULTS.dailyBetVolume,
    brokerTradingFeePercent: DEFAULTS.brokerTradingFeePercent,
    polymarketFeePercent: DEFAULTS.polymarketFeePercent,
    priceAdjustmentPercent: DEFAULTS.priceAdjustmentPercent,
  });

  const [expandedMetrics, setExpandedMetrics] = useState<Set<number>>(
    new Set([0, 1, 2, 3])
  );

  // ============================================================================
  // Core Calculations
  // ============================================================================

  const calculateMetrics = () => {
    const volume = state.dailyBetVolume;
    
    // Revenue from customers
    const brokerFeesCollected = volume * (state.brokerTradingFeePercent / 100);
    
    // Costs to Polymarket
    const polymarketFeesPaid = volume * (state.polymarketFeePercent / 100);
    
    // Price adjustment profit (spread)
    // When broker adjusts price by X%, they make spread on every trade
    const spreadProfit = volume * (state.priceAdjustmentPercent / 100);
    
    // Net profit
    const netProfit = brokerFeesCollected + spreadProfit - polymarketFeesPaid;
    const netMarginPercent = (netProfit / volume) * 100;
    
    // Fee differential
    const feeDifferential = state.brokerTradingFeePercent - state.polymarketFeePercent;
    
    return {
      volume,
      brokerFeesCollected,
      polymarketFeesPaid,
      spreadProfit,
      netProfit,
      netMarginPercent,
      feeDifferential,
    };
  };

  const metrics = calculateMetrics();

  // ============================================================================
  // Scenario Analysis
  // ============================================================================

  const scenarios: MetricsResult[] = useMemo(() => {
    const scenarios: MetricsResult[] = [];

    // SCENARIO 1: Fee Margin Only (no price adjustment)
    const feeMarginOnly = metrics.brokerFeesCollected - metrics.polymarketFeesPaid;
    const feeMarginPercent = (metrics.feeDifferential) * 100;
    
    scenarios.push({
      title: "Scenario 1: Fee Margin Only (No Price Adjustment)",
      description: `Profit purely from the difference between what you charge customers (${state.brokerTradingFeePercent}%) and what Polymarket charges (${state.polymarketFeePercent}%). This is your baseline profit.`,
      breakdown: {
        "Broker Fees Collected": metrics.brokerFeesCollected.toFixed(2),
        "Polymarket Fees Paid": metrics.polymarketFeesPaid.toFixed(2),
        "Fee Margin Profit": feeMarginOnly.toFixed(2),
        "Fee Margin %": (metrics.feeDifferential * 100).toFixed(3) + "%",
        "Daily Profit": feeMarginOnly.toFixed(2),
        "Monthly Profit (30 days)": (feeMarginOnly * 30).toFixed(2),
        "Annual Profit": (feeMarginOnly * 365).toFixed(2),
      },
    });

    // SCENARIO 2: With Price Adjustment (spread)
    scenarios.push({
      title: "Scenario 2: Fee Margin + Price Adjustment Spread",
      description: `Combined profit from fee margin plus price adjustment of ${state.priceAdjustmentPercent}%. You adjust prices slightly higher or lower to capture additional spread.`,
      breakdown: {
        "Broker Fees Collected": metrics.brokerFeesCollected.toFixed(2),
        "Price Adjustment Profit": metrics.spreadProfit.toFixed(2),
        "Total Revenue": (metrics.brokerFeesCollected + metrics.spreadProfit).toFixed(2),
        "Polymarket Fees Paid": metrics.polymarketFeesPaid.toFixed(2),
        "Total Net Profit": metrics.netProfit.toFixed(2),
        "Net Margin %": metrics.netMarginPercent.toFixed(3) + "%",
        "Daily Profit": metrics.netProfit.toFixed(2),
        "Monthly Profit (30 days)": (metrics.netProfit * 30).toFixed(2),
        "Annual Profit": (metrics.netProfit * 365).toFixed(2),
      },
    });

    // SCENARIO 3: Volume Scaling
    const scalingMultipliers = [2, 5, 10];
    const scalingBreakdown: { [key: string]: string } = {};
    
    scalingBreakdown["Daily Volume"] = `${(state.dailyBetVolume / 1000).toFixed(1)}K KES`;
    scalingMultipliers.forEach((mult) => {
      const scaledVolume = state.dailyBetVolume * mult;
      const scaledProfit = metrics.netProfit * mult;
      scalingBreakdown[`${mult}x Volume (${(scaledVolume / 1000).toFixed(0)}K KES)`] = `${scaledProfit.toFixed(2)} KES/day`;
    });
    scalingBreakdown["At 10x: Annual Revenue"] = `${(metrics.netProfit * 10 * 365).toFixed(2)} KES`;

    scenarios.push({
      title: "Scenario 3: Revenue Scaling",
      description: `How your daily profit scales with increased trading volume. This shows the power of scaling your user base.`,
      breakdown: scalingBreakdown,
    });

    // SCENARIO 4: Breakeven & Profitability Analysis
    const breakeven = state.polymarketFeePercent - state.brokerTradingFeePercent >= 0;
    const minAdjustmentToBreakeven = breakeven 
      ? state.polymarketFeePercent - state.brokerTradingFeePercent
      : 0;

    const competitiveScenarios = [
      { rate: 1.5, label: "Aggressive (1.5%)" },
      { rate: 2.0, label: "Competitive (2.0%)" },
      { rate: 2.5, label: "Current (2.5%)" },
      { rate: 3.0, label: "Premium (3.0%)" },
    ];

    const breakdownAnalysis: { [key: string]: string } = {};
    breakdownAnalysis["Polymarket Fee"] = `${state.polymarketFeePercent}%`;
    breakdownAnalysis["Your Fee"] = `${state.brokerTradingFeePercent}%`;
    breakdownAnalysis["Fee Margin"] = `${metrics.feeDifferential * 100}% `;
    breakdownAnalysis["Price Adjustment (Spread)"] = `${state.priceAdjustmentPercent}%`;
    breakdownAnalysis["Total Profit Margin"] = `${metrics.netMarginPercent.toFixed(3)}%`;
    breakdownAnalysis[""] = "";
    
    competitiveScenarios.forEach(({ rate, label }) => {
      const margin = rate - state.polymarketFeePercent;
      const marginWithSpread = margin + state.priceAdjustmentPercent;
      breakdownAnalysis[`At ${label}: Net Margin`] = `${marginWithSpread.toFixed(3)}%`;
    });

    scenarios.push({
      title: "Scenario 4: Fee Strategy Analysis",
      description: `Compare different fee structures to find the optimal balance between competitiveness and profitability. Higher fees hurt user acquisition, but lower fees reduce profit margin.`,
      breakdown: breakdownAnalysis,
    });

    return scenarios;
  }, [state, metrics]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const toggleMetric = (index: number) => {
    const newExpanded = new Set(expandedMetrics);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMetrics(newExpanded);
  };

  const resetState = () => {
    setState({
      dailyBetVolume: DEFAULTS.dailyBetVolume,
      brokerTradingFeePercent: DEFAULTS.brokerTradingFeePercent,
      polymarketFeePercent: DEFAULTS.polymarketFeePercent,
      priceAdjustmentPercent: DEFAULTS.priceAdjustmentPercent,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 md:px-6 pt-32 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Broker Fee & Profit Simulator
          </h1>
          <p className="text-muted-foreground">
            Understand your profit structure: customer fees vs Polymarket fees + price adjustment spreads. Calculate optimal fee levels and project revenue at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-1">
            <div className="bg-muted rounded-2xl p-6 sticky top-40 space-y-6">
              <h2 className="text-xl font-bold text-foreground">
                Configuration
              </h2>

              {/* Trading Volume */}
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Trading Volume
                </h3>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Daily Bet Volume (KES)
                  </label>
                  <input
                    type="number"
                    value={state.dailyBetVolume}
                    onChange={(e) =>
                      setState({
                        ...state,
                        dailyBetVolume: Number(e.target.value),
                      })
                    }
                    min="1000"
                    step="5000"
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total KES volume routed to Polymarket daily
                  </p>
                </div>
              </div>

              {/* Fee Structure */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Fee Structure
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Your Trading Fee: {state.brokerTradingFeePercent.toFixed(2)}%
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.1"
                      value={state.brokerTradingFeePercent}
                      onChange={(e) =>
                        setState({
                          ...state,
                          brokerTradingFeePercent: Number(e.target.value),
                        })
                      }
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      What customers pay you on each trade
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Polymarket Fee: {state.polymarketFeePercent.toFixed(2)}%
                    </label>
                    <input
                      type="number"
                      value={state.polymarketFeePercent}
                      onChange={(e) =>
                        setState({
                          ...state,
                          polymarketFeePercent: Number(e.target.value),
                        })
                      }
                      step="0.1"
                      min="0"
                      max="5"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      What Polymarket charges you
                    </p>
                  </div>

                  {/* Fee Differential Display */}
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Fee Margin (Your Fee - Polymarket Fee)
                    </div>
                    <div className={`text-lg font-bold mt-1 ${
                      metrics.feeDifferential >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {(metrics.feeDifferential * 100).toFixed(3)}%
                    </div>
                    {metrics.feeDifferential < 0 && (
                      <p className="text-xs text-red-500 mt-2">
                        ⚠️ You're losing money on fees! Your fee must be higher than Polymarket's.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Adjustment */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Price Adjustment (Spread)
                </h3>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Price Adjustment: {state.priceAdjustmentPercent.toFixed(2)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={state.priceAdjustmentPercent}
                    onChange={(e) =>
                      setState({
                        ...state,
                        priceAdjustmentPercent: Number(e.target.value),
                      })
                    }
                    className="w-full mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Adjust prices slightly higher/lower than Polymarket to capture spread profit. 0.5% is typical.
                  </p>
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetState}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-background border border-border rounded-lg text-muted-foreground hover:border-foreground hover:text-foreground transition font-semibold"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Right Column: Metrics & Scenarios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted rounded-2xl p-6 border border-border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-xs font-bold text-muted-foreground mb-2 uppercase">
                      Daily Volume
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                      {(metrics.volume / 1000).toFixed(1)}K KES
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>

              <div className={`bg-muted rounded-2xl p-6 border ${metrics.netProfit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-xs font-bold text-muted-foreground mb-2 uppercase">
                      Daily Net Profit
                    </div>
                    <div className={`text-3xl font-bold ${metrics.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {metrics.netProfit.toFixed(2)} KES
                    </div>
                    <div className={`text-sm mt-2 ${metrics.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      Margin: {metrics.netMarginPercent.toFixed(3)}%
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="bg-muted rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">
                Revenue & Cost Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-background rounded-lg p-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Broker Fees Collected</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Volume × {state.brokerTradingFeePercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-500">
                      +{metrics.brokerFeesCollected.toFixed(2)} KES
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-background rounded-lg p-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Price Adjustment Profit</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Volume × {state.priceAdjustmentPercent.toFixed(2)}% spread
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-500">
                      +{metrics.spreadProfit.toFixed(2)} KES
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-background rounded-lg p-4 border-b border-border">
                  <div>
                    <div className="text-sm text-muted-foreground">Polymarket Fees Paid</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Volume × {state.polymarketFeePercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-500">
                      -{metrics.polymarketFeesPaid.toFixed(2)} KES
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-background rounded-lg p-4 border border-green-500">
                  <div>
                    <div className="text-sm font-bold text-foreground">Net Daily Profit</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${metrics.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {metrics.netProfit >= 0 ? '+' : ''}{metrics.netProfit.toFixed(2)} KES
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenarios */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Analysis Scenarios</h3>
              {scenarios.map((scenario, index) => (
                <div
                  key={index}
                  className="bg-muted rounded-2xl overflow-hidden border border-border"
                >
                  {/* Header */}
                  <button
                    onClick={() => toggleMetric(index)}
                    className="w-full p-4 flex items-center justify-between hover:bg-background transition"
                  >
                    <div className="text-left">
                      <h4 className="font-bold text-foreground">{scenario.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {scenario.description}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition flex-shrink-0 ml-4 ${
                        expandedMetrics.has(index) ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Details */}
                  {expandedMetrics.has(index) && (
                    <div className="px-4 pb-4 border-t border-border bg-background">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                        {Object.entries(scenario.breakdown).map(([key, value]) => (
                          <div key={key} className={`rounded-lg p-3 border ${
                            value === "" ? "border-transparent bg-transparent" : "border-border bg-muted"
                          }`}>
                            {value !== "" && (
                              <>
                                <div className="text-xs text-muted-foreground font-semibold">
                                  {key}
                                </div>
                                <div className={`text-sm font-mono font-bold mt-1 ${
                                  key.includes("Profit") || key.includes("Margin") || key.includes("Revenue") || key.includes("Annual")
                                    ? typeof value === "string" && value.includes("-")
                                      ? "text-red-500"
                                      : "text-green-500"
                                    : "text-foreground"
                                }`}>
                                  {typeof value === "number" ? value.toFixed(2) : value}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
