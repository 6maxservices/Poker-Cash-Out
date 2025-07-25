
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Calculator } from "lucide-react";

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-yellow-500">
        <DialogHeader>
          <DialogTitle className="text-white text-center text-xl">
            <DollarSign className="inline text-yellow-500 mr-2" size={24} />
            Set Pot Amount
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 p-4">
          <div>
            <Label className="text-white font-semibold mb-2 block">
              Enter Pot Amount ($)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-500 font-bold text-lg">
                $
              </span>
              <Input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="pl-8 bg-black text-white border-yellow-500 focus:ring-yellow-500 text-lg h-12"
                placeholder="0.00"
                step="0.01"
                min="0"
                max="1000000"
                autoFocus
              />
            </div>
            
            {errors.length > 0 && (
              <div className="mt-2 space-y-1">
                {errors.map((error, index) => (
                  <p key={index} className="text-red-400 text-sm">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-white font-semibold mb-2 block text-sm">
              Quick Amounts
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue(amount.toFixed(2))}
                  className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 hover:border-yellow-500"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={errors.length > 0}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
