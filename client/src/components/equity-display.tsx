import { EquityResult } from "@shared/schema";
import { Calculator, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EquityDisplayProps {
  result: EquityResult | null;
  isCalculating: boolean;
  onRecalculate: () => void;
  onSave: () => void;
  onReset: () => void;
}

export function EquityDisplay({ 
  result, 
  isCalculating, 
  onRecalculate, 
  onSave, 
  onReset 
}: EquityDisplayProps) {
  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-4 backdrop-blur-sm border border-yellow-500 border-opacity-30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isCalculating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-white font-medium">
              {isCalculating ? 'Calculating...' : 'Real-time Calculation'}
            </span>
          </div>
          {result && (
            <div className="text-gray-400">
              <span>{result.iterations.toLocaleString()}</span> iterations • 
              <span className="ml-1">{result.calculationTime.toFixed(3)}s</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={onRecalculate}
            disabled={isCalculating}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            <Calculator className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
          <Button
            onClick={onSave}
            disabled={!result}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Hand
          </Button>
          <Button
            onClick={onReset}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Hand
          </Button>
        </div>
      </div>
    </div>
  );
}
