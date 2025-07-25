
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Calculator, Delete, ArrowLeft } from "lucide-react";

interface PotAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  onAmountChange: (amount: number) => void;
}

export function PotAmountModal({
  isOpen,
  onClose,
  currentAmount,
  onAmountChange
}: PotAmountModalProps) {
  const [inputValue, setInputValue] = useState(currentAmount.toFixed(2));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setInputValue(currentAmount.toFixed(2));
      setErrors([]);
    }
  }, [isOpen, currentAmount]);

  const validateAmount = (value: string): string[] => {
    const errors: string[] = [];
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      errors.push("Please enter a valid number");
    } else if (numValue < 0) {
      errors.push("Amount cannot be negative");
    } else if (numValue > 1000000) {
      errors.push("Amount too large (max: $1,000,000)");
    }
    
    return errors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const validationErrors = validateAmount(value);
    setErrors(validationErrors);
  };

  const handleNumpadClick = (digit: string) => {
    let newValue = inputValue;
    
    if (digit === "clear") {
      newValue = "0.00";
    } else if (digit === "backspace") {
      newValue = inputValue.slice(0, -1) || "0";
    } else if (digit === ".") {
      if (!inputValue.includes(".")) {
        newValue = inputValue + ".";
      }
    } else {
      // Remove leading zeros except for "0."
      if (inputValue === "0.00" || inputValue === "0") {
        newValue = digit;
      } else {
        newValue = inputValue + digit;
      }
    }
    
    setInputValue(newValue);
    const validationErrors = validateAmount(newValue);
    setErrors(validationErrors);
  };

  const handleConfirm = () => {
    const validationErrors = validateAmount(inputValue);
    if (validationErrors.length === 0) {
      const amount = parseFloat(inputValue);
      onAmountChange(amount);
      onClose();
    } else {
      setErrors(validationErrors);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && errors.length === 0) {
      handleConfirm();
    }
  };

  const quickAmounts = [100, 250, 500, 1000, 2500, 5000];

  const numpadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace']
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-gray-900 border-yellow-500 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-center text-2xl">
            <DollarSign className="inline text-yellow-500 mr-2" size={28} />
            Set Pot Amount
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4">
          {/* Display */}
          <div>
            <Label className="text-white font-semibold mb-3 block text-lg">
              Current Amount
            </Label>
            <div className="relative">
              <div className="bg-black rounded-lg p-6 border-2 border-yellow-500">
                <div className="text-center">
                  <span className="text-yellow-500 font-bold text-xl mr-2">$</span>
                  <span className="text-white font-bold text-4xl md:text-5xl">
                    {parseFloat(inputValue || "0").toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {errors.map((error, index) => (
                  <p key={index} className="text-red-400 text-sm text-center">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Hidden input for keyboard users */}
          <Input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="sr-only"
            placeholder="0.00"
            step="0.01"
            min="0"
            max="1000000"
          />

          {/* Big Numpad */}
          <div className="space-y-4">
            <Label className="text-white font-semibold block text-lg text-center">
              Numpad
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {numpadButtons.flat().map((button, index) => (
                <Button
                  key={index}
                  onClick={() => handleNumpadClick(button)}
                  className={`
                    h-16 w-full text-2xl font-bold rounded-xl transition-all duration-200
                    ${button === 'backspace' 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border-2 border-gray-600 hover:border-yellow-500'
                    }
                  `}
                  variant="outline"
                >
                  {button === 'backspace' ? (
                    <ArrowLeft size={24} />
                  ) : (
                    button
                  )}
                </Button>
              ))}
            </div>
            
            {/* Clear button */}
            <Button
              onClick={() => handleNumpadClick('clear')}
              className="w-full h-14 text-xl font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
            >
              <Delete className="mr-2 h-5 w-5" />
              Clear
            </Button>
          </div>

          {/* Quick Amounts */}
          <div>
            <Label className="text-white font-semibold mb-3 block text-lg text-center">
              Quick Amounts
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setInputValue(amount.toFixed(2))}
                  className="h-12 bg-gray-800 text-white border-gray-600 hover:bg-gray-700 hover:border-yellow-500 text-lg font-semibold"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-14 text-lg bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={errors.length > 0}
              className="flex-1 h-14 text-lg bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              <Calculator className="mr-2 h-5 w-5" />
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
