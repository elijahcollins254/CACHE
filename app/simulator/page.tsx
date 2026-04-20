"use client";

import { useState, useMemo } from "react";

import { ChevronDown, RotateCcw, BarChart3, BookOpen } from "lucide-react";

interface SimulationState {
  // Market state
  q_yes: number;
  q_no: number;
  b: number;
  
  // User input
  betAmount: number;
  selectedOutcome: "YES" | "NO";
  tradingFeePercent: number;
  
  // Payout parameters
  payoutPerShare: number;
  
  // Execution
  limitPrice?: number;
  useLimit: boolean;
}

interface StepResult {
  title: string;
  formula: string;
  inputs: { [key: string]: number | string };
  output: number | string;
  description: string;
}

const LMSR_B_DEFAULT = 100.0;
const PAYOUT_PER_SHARE_DEFAULT = 100;
const TRADING_FEE_DEFAULT = 2;

export default function Simulator() {
  const [state, setState] = useState<SimulationState>({
    q_yes: 0,
    q_no: 0,
    b: LMSR_B_DEFAULT,
    betAmount: 100,
    selectedOutcome: "YES",
    tradingFeePercent: TRADING_FEE_DEFAULT,
    payoutPerShare: PAYOUT_PER_SHARE_DEFAULT,
    useLimit: false,
  });

  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 5])
  );

  const [activeTab, setActiveTab] = useState<"details" | "visual">("details");

  // ============================================================================
  // LMSR Math Functions
  // ============================================================================

  const lmsrCost = (q_yes: number, q_no: number, b: number): number => {
    try {
      const exp_yes = Math.exp(q_yes / b);
      const exp_no = Math.exp(q_no / b);
      return b * Math.log(exp_yes + exp_no);
    } catch {
      return Math.max(q_yes, q_no) / b + b;
    }
  };

  const lmsrPriceYes = (q_yes: number, q_no: number, b: number): number => {
    try {
      const exp_yes = Math.exp(q_yes / b);
      const exp_no = Math.exp(q_no / b);
      return exp_yes / (exp_yes + exp_no);
    } catch {
      return q_yes > q_no ? 0.99 : 0.01;
    }
  };

  const lmsrPriceNo = (q_yes: number, q_no: number, b: number): number => {
    return 1 - lmsrPriceYes(q_yes, q_no, b);
  };

  const calculateBuyCost = (
    q_yes: number,
    q_no: number,
    shares: number,
    outcome: "YES" | "NO",
    b: number,
    payoutPerShare: number
  ): number => {
    const q_yes_after =
      outcome === "YES" ? q_yes + shares : q_yes;
    const q_no_after =
      outcome === "YES" ? q_no : q_no + shares;

    const cost_before = lmsrCost(q_yes, q_no, b);
    const cost_after = lmsrCost(q_yes_after, q_no_after, b);

    return (cost_after - cost_before) * payoutPerShare;
  };

  const estimateSharesFromKES = (
    amount_kes: number,
    q_yes: number,
    q_no: number,
    outcome: "YES" | "NO",
    b: number,
    payoutPerShare: number
  ): number => {
    let low = 0,
      high = amount_kes * 2,
      result = 0;

    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      const cost = calculateBuyCost(
        q_yes,
        q_no,
        mid,
        outcome,
        b,
        payoutPerShare
      );

      if (cost < amount_kes) {
        result = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    return result;
  };

  // ============================================================================
  // Visual Graph Data Calculations
  // ============================================================================

  const generatePricePoints = () => {
    const points = [];
    for (let i = -5; i <= 5; i++) {
      const q_yes_adjusted = state.q_yes + i * 10;
      const price = lmsrPriceYes(q_yes_adjusted, state.q_no, state.b) * 100;
      points.push({ x: i * 10, price });
    }
    return points;
  };

  const generateCostCurve = () => {
    const points = [];
    for (let i = -5; i <= 5; i++) {
      const q_yes_adjusted = state.q_yes + i * 10;
      const cost = lmsrCost(q_yes_adjusted, state.q_no, state.b);
      points.push({ x: i * 10, cost });
    }
    return points;
  };

  const shares = estimateSharesFromKES(
    state.betAmount,
    state.q_yes,
    state.q_no,
    state.selectedOutcome,
    state.b,
    state.payoutPerShare
  );

  const tradeCost = calculateBuyCost(
    state.q_yes,
    state.q_no,
    shares,
    state.selectedOutcome,
    state.b,
    state.payoutPerShare
  );

  const feeAmount = tradeCost * (state.tradingFeePercent / 100);
  const totalCost = tradeCost + feeAmount;
  const maxPayout = shares * state.payoutPerShare;
  const profit = maxPayout - totalCost;
  const roi = (profit / totalCost) * 100;

  // ============================================================================
  // Simulation Steps
  // ============================================================================

  const steps: StepResult[] = useMemo(() => {
    const steps: StepResult[] = [];

    // STEP 1: Current Market Price
    const currentPriceYes = lmsrPriceYes(state.q_yes, state.q_no, state.b);
    const currentPriceNo = 1 - currentPriceYes;
    steps.push({
      title: "Step 1: Determine Current Market Price",
      formula:
        "P_yes = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))\nP_no = 1 - P_yes",
      inputs: {
        q_yes: state.q_yes,
        q_no: state.q_no,
        b: state.b,
      },
      output: `YES: ${(currentPriceYes * 100).toFixed(2)}% | NO: ${(
        currentPriceNo * 100
      ).toFixed(2)}%`,
      description:
        "LMSR derives probability from quantity imbalance. Price reflects current market opinion.",
    });

    // STEP 2: Estimate Shares
    const shares = estimateSharesFromKES(
      state.betAmount,
      state.q_yes,
      state.q_no,
      state.selectedOutcome,
      state.b,
      state.payoutPerShare
    );
    steps.push({
      title: "Step 2: Calculate Shares from KES Amount",
      formula:
        "Binary Search: Find shares where Cost(q_yes, q_no, shares) ≈ amount_KES",
      inputs: {
        amount_KES: state.betAmount,
        b: state.b,
        payoutPerShare: state.payoutPerShare,
        outcome: state.selectedOutcome,
      },
      output: `${shares.toFixed(4)} shares`,
      description:
        "Uses binary search to find how many shares you get for your KES amount, accounting for LMSR slippage.",
    });

    // STEP 3: Calculate Execution Price (Average Price During Trade)
    const priceBeforeYes = lmsrPriceYes(state.q_yes, state.q_no, state.b);
    const q_yes_after =
      state.selectedOutcome === "YES"
        ? state.q_yes + shares
        : state.q_yes;
    const q_no_after =
      state.selectedOutcome === "YES"
        ? state.q_no
        : state.q_no + shares;
    const priceAfterYes = lmsrPriceYes(q_yes_after, q_no_after, state.b);
    const avgExecutionPrice =
      state.selectedOutcome === "YES"
        ? ((priceBeforeYes + priceAfterYes) / 2) * 100
        : ((1 - priceBeforeYes + 1 - priceAfterYes) / 2) * 100;

    steps.push({
      title: "Step 3: Calculate Execution Price",
      formula:
        "execution_price = (price_before + price_after) / 2\nslippage = price_after - price_before",
      inputs: {
        price_before: `${(
          state.selectedOutcome === "YES"
            ? priceBeforeYes * 100
            : (1 - priceBeforeYes) * 100
        ).toFixed(2)}%`,
        price_after: `${(
          state.selectedOutcome === "YES"
            ? priceAfterYes * 100
            : (1 - priceAfterYes) * 100
        ).toFixed(2)}%`,
      },
      output: `${avgExecutionPrice.toFixed(2)}%`,
      description:
        "Price slippage shows how much the market moves due to your trade. Large trades cause larger slippage.",
    });

    // STEP 4: Calculate Trade Cost
    const tradeCost = calculateBuyCost(
      state.q_yes,
      state.q_no,
      shares,
      state.selectedOutcome,
      state.b,
      state.payoutPerShare
    );
    steps.push({
      title: "Step 4: Calculate Total Trade Cost",
      formula: "cost = (C_after - C_before) × payoutPerShare\nC(q) = b × ln(exp(q_yes/b) + exp(q_no/b))",
      inputs: {
        C_before: lmsrCost(state.q_yes, state.q_no, state.b).toFixed(4),
        C_after: lmsrCost(q_yes_after, q_no_after, state.b).toFixed(4),
        payoutPerShare: state.payoutPerShare,
        shares: shares.toFixed(4),
      },
      output: `${tradeCost.toFixed(2)} KES`,
      description:
        "LMSR cost function ensures bounded loss for market maker. Each additional share costs more (convex).",
    });

    // STEP 5: Apply Trading Fee
    const feeAmount = tradeCost * (state.tradingFeePercent / 100);
    const totalCost = tradeCost + feeAmount;
    steps.push({
      title: "Step 5: Apply Trading Fee",
      formula: "fee = cost × feePercent / 100\ntotalCost = cost + fee",
      inputs: {
        baseCost: tradeCost.toFixed(2),
        feePercent: state.tradingFeePercent,
      },
      output: `${totalCost.toFixed(2)} KES (fee: ${feeAmount.toFixed(2)} KES)`,
      description:
        "Platform takes a small percentage fee. This funds market operations and incentivizes accurate pricing.",
    });

    // STEP 6: Calculate Max Payout if Outcome Wins
    const maxPayout = shares * state.payoutPerShare;
    const payoutAfterFee = maxPayout * ((100 - state.tradingFeePercent) / 100);
    const profit = payoutAfterFee - totalCost;
    const roi = (profit / totalCost) * 100;

    steps.push({
      title: "Step 6: Calculate Potential Returns",
      formula:
        "maxPayout = shares × payoutPerShare\npayoutAfterFee = maxPayout × (1 - feePercent/100)\nprofit = payoutAfterFee - cost\nROI = profit / cost × 100%",
      inputs: {
        shares: shares.toFixed(4),
        payoutPerShare: state.payoutPerShare,
        totalCost: totalCost.toFixed(2),
        outcomeWinProbability: `${(
          state.selectedOutcome === "YES"
            ? priceAfterYes * 100
            : (1 - priceAfterYes) * 100
        ).toFixed(2)}%`,
      },
      output: `Max: ${maxPayout.toFixed(2)} KES | After Fee: ${payoutAfterFee.toFixed(2)} KES | Profit: ${profit.toFixed(2)} KES | ROI: ${roi.toFixed(2)}%`,
      description:
        "Your return depends on whether your outcome wins AND the fee structure. Positive ROI requires favorable odds.",
    });

    return steps;
  }, [state, lmsrCost, lmsrPriceYes, lmsrPriceNo, estimateSharesFromKES]);

  // ============================================================================
  // Render
  // ============================================================================

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const resetState = () => {
    setState({
      q_yes: 0,
      q_no: 0,
      b: LMSR_B_DEFAULT,
      betAmount: 100,
      selectedOutcome: "YES",
      tradingFeePercent: TRADING_FEE_DEFAULT,
      payoutPerShare: PAYOUT_PER_SHARE_DEFAULT,
      useLimit: false,
    });
  };

  return (
    <div className="min-h-screen bg-background">      <main className="mx-auto max-w-7xl px-4 md:px-6 pt-32 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Bet-to-Payout Simulator
          </h1>
          <p className="text-muted-foreground">
            Visualize the complete process from placing a bet to calculating payout, with interactive LMSR formulas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-1">
            <div className="bg-muted rounded-2xl p-6 sticky top-40">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Configuration
              </h2>

              {/* Market State */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Market State (LMSR)
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      q_yes (YES Quantity)
                    </label>
                    <input
                      type="number"
                      value={state.q_yes}
                      onChange={(e) =>
                        setState({ ...state, q_yes: Number(e.target.value) })
                      }
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Quantity scalar for YES shares issued
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      q_no (NO Quantity)
                    </label>
                    <input
                      type="number"
                      value={state.q_no}
                      onChange={(e) =>
                        setState({ ...state, q_no: Number(e.target.value) })
                      }
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Quantity scalar for NO shares issued
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      b (Liquidity Parameter)
                    </label>
                    <input
                      type="number"
                      value={state.b}
                      onChange={(e) =>
                        setState({ ...state, b: Number(e.target.value) })
                      }
                      step="10"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher = more liquidity, less slippage
                    </p>
                  </div>
                </div>
              </div>

              {/* Bet Parameters */}
              <div className="mb-6 pt-6 border-t border-border">
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Bet Parameters
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Bet Amount (KES)
                    </label>
                    <input
                      type="number"
                      value={state.betAmount}
                      onChange={(e) =>
                        setState({
                          ...state,
                          betAmount: Number(e.target.value),
                        })
                      }
                      min="1"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Select Outcome
                    </label>
                    <div className="flex gap-2 mt-2">
                      {(["YES", "NO"] as const).map((outcome) => (
                        <button
                          key={outcome}
                          onClick={() =>
                            setState({
                              ...state,
                              selectedOutcome: outcome,
                            })
                          }
                          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition ${
                            state.selectedOutcome === outcome
                              ? outcome === "YES"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                              : "bg-background border border-border text-muted-foreground hover:border-foreground"
                          }`}
                        >
                          {outcome}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee & Payout */}
              <div className="mb-6 pt-6 border-t border-border">
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase">
                  Fee & Payout
                </h3>

                <div className="space-y-4">
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
                  </div>

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

          {/* Right Column: Simulation Steps */}
          <div className="lg:col-span-2 space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-muted rounded-2xl overflow-hidden border border-border"
              >
                {/* Step Header */}
                <button
                  onClick={() => toggleStep(index)}
                  className="w-full p-4 flex items-center justify-between hover:bg-background transition"
                >
                  <div className="text-left">
                    <h3 className="font-bold text-foreground">{step.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition ${
                      expandedSteps.has(index) ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Step Details */}
                {expandedSteps.has(index) && (
                  <div className="px-4 pb-4 border-t border-border bg-background space-y-4">
                    {/* Formula */}
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase">
                        Formula
                      </h4>
                      <div className="bg-muted border border-border rounded-lg p-3 font-mono text-sm text-foreground whitespace-pre-wrap break-words">
                        {step.formula}
                      </div>
                    </div>

                    {/* Inputs */}
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase">
                        Inputs
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(step.inputs).map(([key, value]) => (
                          <div key={key} className="bg-background p-2 rounded border border-border">
                            <div className="text-xs text-muted-foreground font-semibold">
                              {key}
                            </div>
                            <div className="text-sm font-mono text-foreground">
                              {typeof value === "number"
                                ? value.toFixed(4)
                                : value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Output */}
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase">
                        Output
                      </h4>
                      <div className="bg-background border border-green-500 rounded-lg p-3">
                        <div className="font-mono text-lg font-bold text-green-500">
                          {step.output}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
