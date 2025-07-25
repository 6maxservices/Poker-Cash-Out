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
    <div className="bg-black bg-opacity-60 rounded-xl p-3 backdrop-blur-sm border border-yellow-500 border-opacity-30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isCalculating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-white font-medium text-sm">
              {isCalculating ? 'Calculating...' : 'Real-time'}
            </span>
          </div>
          {result && (
            <div className="text-gray-400 text-xs">
              <span>{result.iterations.toLocaleString()}</span> iterations • 
              <span className="ml-1">{result.calculationTime.toFixed(3)}s</span>
              {result.tiePercentage > 0 && (
                <span className="ml-2 text-orange-400">
                  • Ties: {result.tiePercentage.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onRecalculate}
            disabled={isCalculating}
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-xs h-8"
          >
            <Calculator className="mr-1 h-3 w-3" />
            Recalc
          </Button>
          <Button
            onClick={onSave}
            disabled={!result}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8"
          >
            <Save className="mr-1 h-3 w-3" />
            Save
          </Button>
          <Button
            onClick={onReset}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-8"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
