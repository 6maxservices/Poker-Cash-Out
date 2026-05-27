import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, TrendingUp, DollarSign, Award, HelpCircle, RefreshCw, Layers } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

// Stakes preset definitions
interface StakePreset {
  name: string;
  potSize: number;
  label: string;
}

const STAKE_PRESETS: StakePreset[] = [
  { name: "nlh2", label: "$1/$2 NLH (Pot: $150)", potSize: 150 },
  { name: "nlh5", label: "$2/$5 NLH (Pot: $500)", potSize: 500 },
  { name: "nlh10", label: "$5/$10 NLH (Pot: $1,500)", potSize: 1500 },
  { name: "plo4", label: "$2/$5 PLO4 (Pot: $800)", potSize: 800 },
  { name: "plo5", label: "$5/$10 PLO5 (Pot: $2,500)", potSize: 2500 },
  { name: "custom", label: "Custom Pot Size", potSize: 1000 }
];

interface VarianceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFee: number;
}

interface PathPoint {
  hand: number;
  "Worst Run (5th%)": number;
  "Median Run (50th%)": number;
  "Best Run (95th%)": number;
}

export function VarianceCalculatorModal({
  isOpen,
  onClose,
  currentFee
}: VarianceCalculatorModalProps) {
  const [selectedStake, setSelectedStake] = useState<string>("nlh5");
  const [potSize, setPotSize] = useState<number>(500);
  const [handsCount, setHandsCount] = useState<number>(500);
  const [avgEquity, setAvgEquity] = useState<number>(70); // 70% average player equity
  const [feePercentage, setFeePercentage] = useState<number>(currentFee);
  const [confidence, setConfidence] = useState<"95" | "99" | "99.9">("99");
  
  // Monte Carlo simulation states
  const [simData, setSimData] = useState<PathPoint[]>([]);
  const [probabilityOfLoss, setProbabilityOfLoss] = useState<number>(0);
  const [maxSimDownswing, setMaxSimDownswing] = useState<number>(0);
  const [simReserve, setSimReserve] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Sync preset changes
  useEffect(() => {
    const preset = STAKE_PRESETS.find(p => p.name === selectedStake);
    if (preset && selectedStake !== "custom") {
      setPotSize(preset.potSize);
    }
  }, [selectedStake]);

  // Sync fee with app setting initially
  useEffect(() => {
    setFeePercentage(currentFee);
  }, [currentFee, isOpen]);

  // Handle custom pot changes
  const handlePotSizeChange = (val: number) => {
    setPotSize(val);
    setSelectedStake("custom");
  };

  // 1. Analytical Mathematical calculations
  const mathResults = useMemo(() => {
    const S = potSize;
    const N = handsCount;
    const p = avgEquity / 100;
    const f = feePercentage / 100;

    // EV = N * S * p * f
    const expectedEdgeRevenue = N * S * p * f;
    
    // Variance = N * S^2 * p * (1 - p)
    const totalVariance = N * Math.pow(S, 2) * p * (1 - p);
    const standardDeviation = Math.sqrt(totalVariance);

    // Ruin Risk Z-scores
    const zScore = confidence === "95" ? 1.645 
                 : confidence === "99" ? 2.33 
                 : 3.09;

    // Worst case downswing = Z * SD - EV
    const worstCaseDownswing = zScore * standardDeviation - expectedEdgeRevenue;

    // Safe minimum reserve is 5x average pot to survive immediate bad beats
    const safeMinimum = S * 5;
    const recommendedBankroll = Math.max(safeMinimum, worstCaseDownswing);

    return {
      expectedEdgeRevenue: Math.round(expectedEdgeRevenue),
      standardDeviation: Math.round(standardDeviation),
      worstCaseDownswing: worstCaseDownswing > 0 ? Math.round(worstCaseDownswing) : 0,
      recommendedBankroll: Math.round(recommendedBankroll),
      isRiskAbsorbed: worstCaseDownswing <= 0
    };
  }, [potSize, handsCount, avgEquity, feePercentage, confidence]);

  // Box-Muller transform to generate standard normal variables
  const boxMullerRandom = (): number => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  // 2. High-speed Monte Carlo simulation
  const runMonteCarlo = useCallback(() => {
    setIsSimulating(true);
    
    // Defer slightly to allow spinner to render
    setTimeout(() => {
      const S = potSize;
      const N = handsCount;
      const p = avgEquity / 100;
      const f = feePercentage / 100;

      const numTrials = 1000;
      const numSteps = 20; // 20 segments for the chart
      const handsPerStep = N / numSteps;

      // Segment statistics
      const segmentEV = handsPerStep * S * p * f;
      const segmentVar = handsPerStep * Math.pow(S, 2) * p * (1 - p);
      const segmentSD = Math.sqrt(segmentVar);

      // Keep track of final bankroll outcomes of 1000 trials
      const trialFinalBalances: number[] = [];
      const trialMinPoints: number[] = [];

      // Initialize path tracker
      const stepPaths: number[][] = Array.from({ length: numSteps + 1 }, () => []);

      for (let trial = 0; trial < numTrials; trial++) {
        let currentBalance = 0;
        let minPoint = 0;
        
        stepPaths[0].push(0);

        for (let step = 1; step <= numSteps; step++) {
          const rand = boxMullerRandom();
          const change = segmentEV + rand * segmentSD;
          currentBalance += change;
          
          if (currentBalance < minPoint) {
            minPoint = currentBalance;
          }
          
          stepPaths[step].push(currentBalance);
        }

        trialFinalBalances.push(currentBalance);
        trialMinPoints.push(minPoint);
      }

      // Calculate Percentiles at each step for the Recharts graph
      const chartPoints: PathPoint[] = [];
      for (let step = 0; step <= numSteps; step++) {
        const stepValues = [...stepPaths[step]].sort((a, b) => a - b);
        
        // Percentile indexes
        const idx5 = Math.floor(numTrials * 0.05);
        const idx50 = Math.floor(numTrials * 0.50);
        const idx95 = Math.floor(numTrials * 0.95);

        chartPoints.push({
          hand: Math.round(step * handsPerStep),
          "Worst Run (5th%)": Math.round(stepValues[idx5]),
          "Median Run (50th%)": Math.round(stepValues[idx50]),
          "Best Run (95th%)": Math.round(stepValues[idx95])
        });
      }

      // Statistics calculations
      const negativePathsCount = trialFinalBalances.filter(bal => bal < 0).length;
      const lossProbability = (negativePathsCount / numTrials) * 100;
      
      const deepestDownswing = Math.min(...trialMinPoints);
      
      // Sort min points to find the 1st percentile downswing
      const sortedMinPoints = [...trialMinPoints].sort((a, b) => a - b);
      const idx1Point = Math.floor(numTrials * 0.01);
      const empiricalReserve = Math.max(S * 5, -sortedMinPoints[idx1Point]);

      setSimData(chartPoints);
      setProbabilityOfLoss(lossProbability);
      setMaxSimDownswing(Math.abs(deepestDownswing));
      setSimReserve(empiricalReserve);
      setIsSimulating(false);
    }, 50);
  }, [potSize, handsCount, avgEquity, feePercentage]);

  // Run initial simulation on open or parameter changes
  useEffect(() => {
    if (isOpen) {
      runMonteCarlo();
    }
  }, [isOpen, potSize, handsCount, avgEquity, feePercentage]);

  const formatCurrencyValue = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 border border-yellow-500/20 text-white max-h-[92vh] flex flex-col p-4 md:p-5 select-none rounded-2xl overflow-y-auto">
        <DialogHeader className="flex-shrink-0 mb-2">
          <DialogTitle className="text-xl sm:text-2xl font-black text-yellow-400 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-yellow-400" />
            House Variance & Capital Reserve Simulator
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs sm:text-sm">
            Configure stakes and run probability math to ensure the house is safe from bad downswings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid grid-cols-12 gap-4 overflow-hidden min-h-0">
          {/* Left Column: Parameter Inputs (Col Span: 5) */}
          <div className="col-span-12 lg:col-span-5 bg-black/45 border border-gray-800 rounded-xl p-3.5 space-y-4">
            <h3 className="text-xs font-black text-yellow-400 uppercase tracking-widest border-b border-gray-800 pb-1.5 flex items-center justify-between">
              <span>Simulation Controls</span>
              <Layers className="h-3.5 w-3.5" />
            </h3>

            {/* Presets */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-400">STAKES / GAME LEVEL</Label>
              <select
                value={selectedStake}
                onChange={(e) => setSelectedStake(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 h-9"
              >
                {STAKE_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Custom Pot Size */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-gray-400">AVERAGE POT SIZE</Label>
                <span className="text-xs font-bold text-yellow-400">{formatCurrencyValue(potSize)}</span>
              </div>
              <div className="flex gap-2 items-center">
                <Slider
                  min={50}
                  max={5000}
                  step={50}
                  value={[potSize]}
                  onValueChange={(val) => handlePotSizeChange(val[0])}
                  className="flex-grow"
                />
                <Input
                  type="number"
                  value={potSize}
                  onChange={(e) => handlePotSizeChange(Number(e.target.value))}
                  className="w-18 h-8 text-xs bg-gray-900 border-gray-700 text-right font-mono"
                />
              </div>
            </div>

            {/* Simulated Hands */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-gray-400">SIMULATED HANDS COUNT ($N$)</Label>
                <span className="text-xs font-bold text-yellow-400 font-mono">{handsCount} Hands</span>
              </div>
              <Slider
                min={50}
                max={5000}
                step={50}
                value={[handsCount]}
                onValueChange={(val) => setHandsCount(val[0])}
              />
            </div>

            {/* Average Cashout Equity */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-gray-400">AVG PLAYER CASHOUT EQUITY</Label>
                <span className="text-xs font-bold text-yellow-400 font-mono">{avgEquity}%</span>
              </div>
              <Slider
                min={50}
                max={90}
                step={1}
                value={[avgEquity]}
                onValueChange={(val) => setAvgEquity(val[0])}
              />
            </div>

            {/* House Fee */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-gray-400">HOUSE COMMISSION FEE</Label>
                <span className="text-xs font-bold text-yellow-400 font-mono">{feePercentage}%</span>
              </div>
              <Slider
                min={1}
                max={15}
                step={0.5}
                value={[feePercentage]}
                onValueChange={(val) => setFeePercentage(val[0])}
              />
            </div>

            {/* Confidence Slider */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 block mb-1">WORST-CASE PROTECTION RISK</Label>
              <div className="grid grid-cols-3 gap-1.5 bg-black/55 p-0.5 rounded-lg border border-gray-800">
                <button
                  type="button"
                  onClick={() => setConfidence("95")}
                  className={`px-2 py-1 text-[10px] font-black rounded uppercase transition-all ${
                    confidence === "95" ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white"
                  }`}
                >
                  95% Safe
                </button>
                <button
                  type="button"
                  onClick={() => setConfidence("99")}
                  className={`px-2 py-1 text-[10px] font-black rounded uppercase transition-all ${
                    confidence === "99" ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white"
                  }`}
                >
                  99% Std
                </button>
                <button
                  type="button"
                  onClick={() => setConfidence("99.9")}
                  className={`px-2 py-1 text-[10px] font-black rounded uppercase transition-all ${
                    confidence === "99.9" ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white"
                  }`}
                >
                  99.9% Max
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Displays & Graphs (Col Span: 7) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col justify-between overflow-hidden min-h-0 space-y-3">
            <Tabs defaultValue="math" className="w-full flex-grow flex flex-col min-h-0">
              <TabsList className="bg-black/60 border border-gray-800 rounded-lg p-0.5 flex-shrink-0 grid grid-cols-2">
                <TabsTrigger value="math" className="text-xs font-bold">
                  <Award className="h-3.5 w-3.5 mr-1" />
                  Analytical Reserves
                </TabsTrigger>
                <TabsTrigger value="sim" className="text-xs font-bold">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  Monte Carlo Simulator
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Analytical Math results */}
              <TabsContent value="math" className="flex-grow min-h-0 flex flex-col justify-between mt-2 overflow-hidden">
                <div className="grid grid-cols-2 gap-3 mb-2 flex-shrink-0">
                  <div className="bg-black/45 border border-gray-800 rounded-xl p-3.5 text-center">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">EXPECTED EDGE REVENUE</span>
                    <span className="text-xl md:text-2xl font-black text-green-400">{formatCurrencyValue(mathResults.expectedEdgeRevenue)}</span>
                  </div>
                  <div className="bg-black/45 border border-gray-800 rounded-xl p-3.5 text-center">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">STANDARD DEVIATION (σ)</span>
                    <span className="text-xl md:text-2xl font-black text-blue-400">{formatCurrencyValue(mathResults.standardDeviation)}</span>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex-grow flex flex-col justify-between min-h-0 mb-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-black uppercase text-yellow-400 tracking-wider">CAPITAL REQUIREMENT SUMMARY</h4>
                      <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                        To back a session of <strong className="text-white font-bold">{handsCount} hands</strong> at an average pot of <strong className="text-white font-bold">{formatCurrencyValue(potSize)}</strong>, the house stands to make an expected **{formatCurrencyValue(mathResults.expectedEdgeRevenue)}** in fee commissions.
                      </p>
                      <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                        However, to protect against a **{confidence === "95" ? "1 in 20" : confidence === "99" ? "1 in 100" : "1 in 1000"} bad run** (value at risk downswing of <strong className="text-yellow-400 font-bold">{formatCurrencyValue(mathResults.worstCaseDownswing)}</strong>), the house must hold a reserve in bank.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-800/80 mt-3 pt-3 flex justify-between items-center px-2">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">RECOMMENDED HOUSE RESERVE</span>
                      {mathResults.isRiskAbsorbed && (
                        <span className="text-[9px] font-bold text-green-400/80 tracking-wide uppercase mt-0.5 block">Edge Absorbs Variance (Minimum Applied)</span>
                      )}
                    </div>
                    <span className="text-2xl md:text-3xl font-black text-yellow-400 font-mono">
                      {formatCurrencyValue(mathResults.recommendedBankroll)}
                    </span>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Monte Carlo simulation chart */}
              <TabsContent value="sim" className="flex-grow min-h-0 flex flex-col justify-between mt-2 overflow-hidden">
                <div className="flex-shrink-0 flex justify-between items-center bg-black/45 border border-gray-800 rounded-xl px-3 py-1.5 mb-2 gap-2">
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">PROBABILITY OF LOSS</span>
                      <span className="text-sm font-black text-red-400 font-mono">{probabilityOfLoss.toFixed(1)}%</span>
                    </div>
                    <div className="w-[1px] bg-gray-800 h-5 mt-1.5"></div>
                    <div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">DEEPEST DOWNSWING</span>
                      <span className="text-sm font-black text-yellow-500 font-mono">{formatCurrencyValue(maxSimDownswing)}</span>
                    </div>
                    <div className="w-[1px] bg-gray-800 h-5 mt-1.5"></div>
                    <div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">EMPIRICAL RESERVE</span>
                      <span className="text-sm font-black text-green-400 font-mono">{formatCurrencyValue(simReserve)}</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={runMonteCarlo}
                    disabled={isSimulating}
                    size="sm"
                    className="h-7 text-[10px] font-bold bg-yellow-500 hover:bg-yellow-600 text-black flex items-center gap-1 rounded-md"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSimulating ? 'animate-spin' : ''}`} />
                    Resimulate
                  </Button>
                </div>

                {/* Simulation Line Chart */}
                <div className="flex-grow min-h-0 bg-black/60 border border-gray-800/80 rounded-xl p-2 relative overflow-hidden flex items-center justify-center">
                  {isSimulating ? (
                    <div className="text-center space-y-2">
                      <RefreshCw className="h-7 w-7 text-yellow-500 animate-spin mx-auto" />
                      <span className="text-xs text-gray-400">Executing 1,000 independent sessions...</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={simData}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis 
                          dataKey="hand" 
                          stroke="#9ca3af" 
                          fontSize={9} 
                          tickLine={false}
                          label={{ value: 'Hands Played', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 8 }}
                        />
                        <YAxis 
                          stroke="#9ca3af" 
                          fontSize={9} 
                          tickLine={false}
                          tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f2937', color: 'white', fontSize: 10 }}
                          formatter={(value) => [`$${value}`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                        <Line type="monotone" dataKey="Best Run (95th%)" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="Median Run (50th%)" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="Worst Run (5th%)" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Bottom Footer Details */}
            <div className="flex-shrink-0 text-center py-0.5 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400 gap-2">
              <span className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3 text-gray-500" />
                Reserve capital cushions the house against bad swings during low hand volumes.
              </span>
              <Button
                onClick={onClose}
                size="sm"
                className="h-7 text-[10px] font-bold bg-gray-800 hover:bg-gray-700 text-white rounded-md px-3"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
