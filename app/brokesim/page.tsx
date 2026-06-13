"use client";

import { useState, useMemo } from "react";
import { ChevronDown, RotateCcw, TrendingUp, DollarSign } from "lucide-react";

interface BrokerageState {
  // Trader volume
  numberOfBets: number;
  averageBetSize: number;
  
  // Outcome distribution
  yesPercentage: number;
  
  // Fee structure
  tradingFeePercent: number;
  
  // Market parameters
  payoutPerShare: number;
  outcomeWinProbability: number; // What probability outcome actually wins
}

interface ScenarioResult {
  title: string;
  scenario: string;
  metrics: { [key: string]: number | string };
}

const DEFAULTS = {
  numberOfBets: 100,
  averageBetSize: 500,
  yesPercentage: 60,
  tradingFeePercent: 2,
  payoutPerShare: 100,
  outcomeWinProbability: 65,
};

export default function BrokerSim() {
  const [state, setState] = useState<BrokerageState>({
    numberOfBets: DEFAULTS.numberOfBets,
    averageBetSize: DEFAULTS.averageBetSize,
    yesPercentage: DEFAULTS.yesPercentage,
    tradingFeePercent: DEFAULTS.tradingFeePercent,
    payoutPerShare: DEFAULTS.payoutPerShare,
    outcomeWinProbability: DEFAULTS.outcomeWinProbability,
  });

  const [expandedScenarios, setExpandedScenarios] = useState<Set<number>>(
    new Set([0, 1, 2, 3])
  );

  // ============================================================================
  // Core Calculations
  // ============================================================================

  const calculateMetrics = () => {
    const totalVolume = state.numberOfBets * state.averageBetSize;
    const totalFees = totalVolume * (state.tradingFeePercent / 100);
    
    const yesBets = state.numberOfBets * (state.yesPercentage / 100);
    const noBets = state.numberOfBets * (1 - state.yesPercentage / 100);
    
    const yesVolume = yesBets * state.averageBetSize;
    const noVolume = noBets * state.averageBetSize;
    
    // Imbalance (platform exposure)
    const imbalance = Math.abs(yesVolume - noVolume);
    
    // Expected payouts based on outcome probability
    const winnerPayouts = {
      yesWins: yesBets * state.averageBetSize * (state.payoutPerShare / 100),
      noWins: noBets * state.averageBetSize * (state.payoutPerShare / 100),
    };
    
    // Money from losers (no payout)
    const loserMoney = {
      fromYesBettors: noBets * state.averageBetSize * (state.outcomeWinProbability / 100),
      fromNoBettors: yesBets * state.averageBetSize * (1 - state.outcomeWinProbability / 100),
    };

    return {
      totalVolume,
      totalFees,
      yesBets,
      noBets,
      yesVolume,
      noVolume,
      imbalance,
      winnerPayouts,
      loserMoney,
    };
  };

  const metrics = calculateMetrics();

  // ============================================================================
  // Profit Scenarios
  // ============================================================================

  const scenarios: ScenarioResult[] = useMemo(() => {
    const scenarios: ScenarioResult[] = [];

    // SCENARIO 1: YES Outcome Wins
    const yesWinsPayouts = metrics.yesBets * state.averageBetSize * (state.payoutPerShare / 100);
    const yesWinsPlatformLoss = yesWinsPayouts - (metrics.noVolume);
    const yesWinsProfit = metrics.totalFees - yesWinsPlatformLoss;

    scenarios.push({
      title: "Scenario 1: YES Outcome Wins",
      scenario: `If the YES outcome wins at probability ${state.outcomeWinProbability}%, the platform pays winners (YES bettors) and keeps money from losers (NO bettors).`,
      metrics: {
        "Payouts to YES Bettors": yesWinsPayouts.toFixed(2),
        "Money from NO Bettors": metrics.noVolume.toFixed(2),
        "Total Fees Collected": metrics.totalFees.toFixed(2),
        "Platform P&L": yesWinsProfit.toFixed(2),
        "Effective Margin": ((yesWinsProfit / metrics.totalVolume) * 100).toFixed(2) + "%",
      },
    });

    // SCENARIO 2: NO Outcome Wins
    const noWinsPayouts = metrics.noBets * state.averageBetSize * (state.payoutPerShare / 100);
    const noWinsPlatformLoss = noWinsPayouts - metrics.yesVolume;
    const noWinsProfit = metrics.totalFees - noWinsPlatformLoss;

    scenarios.push({
      title: "Scenario 2: NO Outcome Wins",
      scenario: `If the NO outcome wins, the platform pays winners (NO bettors) and keeps money from losers (YES bettors).`,
      metrics: {
        "Payouts to NO Bettors": noWinsPayouts.toFixed(2),
        "Money from YES Bettors": metrics.yesVolume.toFixed(2),
        "Total Fees Collected": metrics.totalFees.toFixed(2),
        "Platform P&L": noWinsProfit.toFixed(2),
        "Effective Margin": ((noWinsProfit / metrics.totalVolume) * 100).toFixed(2) + "%",
      },
    });

    // SCENARIO 3: Expected Value (Probability-Weighted)
    const probYesWins = state.outcomeWinProbability / 100;
    const probNoWins = 1 - probYesWins;
    
    const expectedPayouts = (yesWinsPayouts * probYesWins) + (noWinsPayouts * probNoWins);
    const expectedMoneyFromLosers = (metrics.noVolume * probYesWins) + (metrics.yesVolume * probNoWins);
    const expectedProfit = metrics.totalFees + expectedMoneyFromLosers - expectedPayouts;
    const expectedMargin = (expectedProfit / metrics.totalVolume) * 100;

    scenarios.push({
      title: "Scenario 3: Expected Value Analysis",
      scenario: `Expected profit based on ${state.outcomeWinProbability}% probability YES wins and ${100 - state.outcomeWinProbability}% probability NO wins.`,
      metrics: {
        "Expected Payouts": expectedPayouts.toFixed(2),
        "Expected Money from Losers": expectedMoneyFromLosers.toFixed(2),
        "Total Fees Collected": metrics.totalFees.toFixed(2),
        "Expected Platform P&L": expectedProfit.toFixed(2),
        "Expected Margin": expectedMargin.toFixed(2) + "%",
        "Breakeven Probability": "50%", // Platform breaks even when markets are perfectly balanced
      },
    });

    // SCENARIO 4: Scaling Analysis
    const scalingFactors = [2, 5, 10];
    const scalingMetrics: { [key: string]: string } = {
      "Bets per Scale Factor": "",
      "Revenue at 2x": (metrics.totalFees * 2).toFixed(2),
      "Revenue at 5x": (metrics.totalFees * 5).toFixed(2),
      "Revenue at 10x": (metrics.totalFees * 10).toFixed(2),
      "Expected Profit at 2x (EV)": (expectedProfit * 2).toFixed(2),
      "Expected Profit at 5x (EV)": (expectedProfit * 5).toFixed(2),
      "Expected Profit at 10x (EV)": (expectedProfit * 10).toFixed(2),
    };

    scenarios.push({
      title: "Scenario 4: Scaling Analysis",
      scenario: `How platform revenue and profit scale with increased betting volume at current parameters.`,
      metrics: scalingMetrics,
    });

    return scenarios;
  }, [state, metrics]);

  // ============================================================================
  // Summary Stats
  // ============================================================================

  const summaryStats = useMemo(() => {
    const probYesWins = state.outcomeWinProbability / 100;
    const probNoWins = 1 - probYesWins;
    
    const yesWinsPayouts = metrics.yesBets * state.averageBetSize * (state.payoutPerShare / 100);
    const noWinsPayouts = metrics.noBets * state.averageBetSize * (state.payoutPerShare / 100);
    
    const expectedPayouts = (yesWinsPayouts * probYesWins) + (noWinsPayouts * probNoWins);
    const expectedMoneyFromLosers = (metrics.noVolume * probYesWins) + (metrics.yesVolume * probNoWins);
    const expectedProfit = metrics.totalFees + expectedMoneyFromLosers - expectedPayouts;

    return {
      expectedProfit,
      expectedMargin: (expectedProfit / metrics.totalVolume) * 100,
      imbalanceRisk: metrics.imbalance,
    };
  }, [state, metrics]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const toggleScenario = (index: number) => {
    const newExpanded = new Set(expandedScenarios);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedScenarios(newExpanded);
  };

  const resetState = () => {
    setState({
      numberOfBets: DEFAULTS.numberOfBets,
      averageBetSize: DEFAULTS.averageBetSize,
      yesPercentage: DEFAULTS.yesPercentage,
      tradingFeePercent: DEFAULTS.tradingFeePercent,
      payoutPerShare: DEFAULTS.payoutPerShare,
      outcomeWinProbability: DEFAULTS.outcomeWinProbability,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 md:px-6 pt-32 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Brokerage Revenue Simulator
          </h1>
          <p className="text-muted-foreground">
            Calculate platform profit from betting volume, analyze fee structures, and project revenue at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-1">
            <div className="bg-muted rounded-2xl p-6 sticky top-40 space-y-6">
              <h2 className="text-xl font-bold text-foreground">
                Configuration
              </h2>

              {/* Volume & Bets */}
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Trading Volume
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Number of Bets
                    </label>
                    <input
                      type="number"
                      value={state.numberOfBets}
                      onChange={(e) =>
                        setState({
                          ...state,
                          numberOfBets: Number(e.target.value),
                        })
                      }
                      min="1"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total number of individual bets placed
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Average Bet Size (KES)
                    </label>
                    <input
                      type="number"
                      value={state.averageBetSize}
                      onChange={(e) =>
                        setState({
                          ...state,
                          averageBetSize: Number(e.target.value),
                        })
                      }
                      min="1"
                      step="50"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Average amount per bet
                    </p>
                  </div>
                </div>
              </div>

              {/* Outcome Distribution */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Outcome Distribution
                </h3>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    YES Bet Percentage: {state.yesPercentage.toFixed(1)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={state.yesPercentage}
                    onChange={(e) =>
                      setState({
                        ...state,
                        yesPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Distribution of bets between YES ({state.yesPercentage.toFixed(1)}%) and NO ({(100 - state.yesPercentage).toFixed(1)}%)
                  </p>
                </div>
              </div>

              {/* Fee Structure */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Fee Structure
                </h3>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Trading Fee (%)
                  </label>
                  <input
                    type="number"
                    value={state.tradingFeePercent}
                    onChange={(e) =>
                      setState({
                        ...state,
                        tradingFeePercent: Number(e.target.value),
                      })
                    }
                    step="0.1"
                    min="0"
                    max="10"
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Commission on each bet
                  </p>
                </div>
              </div>

              {/* Outcome Parameters */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Outcome Parameters
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Payout per Share (KES)
                    </label>
                    <input
                      type="number"
                      value={state.payoutPerShare}
                      onChange={(e) =>
                        setState({
                          ...state,
                          payoutPerShare: Number(e.target.value),
                        })
                      }
                      step="10"
                      min="10"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Actual Outcome Win Probability: {state.outcomeWinProbability}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={state.outcomeWinProbability}
                      onChange={(e) =>
                        setState({
                          ...state,
                          outcomeWinProbability: Number(e.target.value),
                        })
                      }
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Probability the YES outcome actually wins
                    </p>
                  </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted rounded-2xl p-4 border border-border">
                <div className="text-xs font-bold text-muted-foreground mb-2 uppercase">
                  Total Volume
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {(metrics.totalVolume / 1000).toFixed(1)}K KES
                </div>
              </div>

              <div className="bg-muted rounded-2xl p-4 border border-border">
                <div className="text-xs font-bold text-muted-foreground mb-2 uppercase">
                  Total Fees
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {metrics.totalFees.toFixed(0)} KES
                </div>
              </div>

              <div className="bg-muted rounded-2xl p-4 border border-border">
                <div className="text-xs font-bold text-muted-foreground mb-2 uppercase">
                  Expected Profit
                </div>
                <div className={`text-2xl font-bold ${summaryStats.expectedProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {summaryStats.expectedProfit.toFixed(0)} KES
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Margin: {summaryStats.expectedMargin.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-muted rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">
                Volume Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-background rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">YES Bets</div>
                  <div className="text-lg font-bold text-foreground mt-1">
                    {metrics.yesBets.toFixed(0)}
                  </div>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">NO Bets</div>
                  <div className="text-lg font-bold text-foreground mt-1">
                    {metrics.noBets.toFixed(0)}
                  </div>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">YES Volume</div>
                  <div className="text-lg font-bold text-foreground mt-1">
                    {(metrics.yesVolume / 1000).toFixed(1)}K KES
                  </div>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">NO Volume</div>
                  <div className="text-lg font-bold text-foreground mt-1">
                    {(metrics.noVolume / 1000).toFixed(1)}K KES
                  </div>
                </div>
              </div>
            </div>

            {/* Scenarios */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Profit Scenarios</h3>
              {scenarios.map((scenario, index) => (
                <div
                  key={index}
                  className="bg-muted rounded-2xl overflow-hidden border border-border"
                >
                  {/* Scenario Header */}
                  <button
                    onClick={() => toggleScenario(index)}
                    className="w-full p-4 flex items-center justify-between hover:bg-background transition"
                  >
                    <div className="text-left">
                      <h4 className="font-bold text-foreground">{scenario.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {scenario.scenario}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition flex-shrink-0 ml-4 ${
                        expandedScenarios.has(index) ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Scenario Details */}
                  {expandedScenarios.has(index) && (
                    <div className="px-4 pb-4 border-t border-border bg-background">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                        {Object.entries(scenario.metrics).map(([key, value]) => (
                          <div key={key} className="bg-muted rounded-lg p-3 border border-border">
                            <div className="text-xs text-muted-foreground font-semibold">
                              {key}
                            </div>
                            <div className={`text-sm font-mono font-bold mt-1 ${
                              key.includes("P&L") || key.includes("Profit")
                                ? typeof value === "string"
                                  ? parseFloat(value) >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                  : value >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                                : "text-foreground"
                            }`}>
                              {typeof value === "number" ? value.toFixed(2) : value}
                            </div>
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
