
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Monitor, User, Palette } from 'lucide-react';
import { AppTheme, setAppTheme } from '@/lib/theme-utils';

interface ThemeSelectorProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  className?: string;
}

export function ThemeSelector({ currentTheme, onThemeChange, className }: ThemeSelectorProps) {
  const handleThemeChange = (theme: AppTheme) => {
    setAppTheme(theme);
    onThemeChange(theme);
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4" />
        <span className="font-semibold text-sm">Display Mode</span>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant={currentTheme === 'dealer' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleThemeChange('dealer')}
          className="flex items-center gap-2 flex-1"
        >
          <User className="w-4 h-4" />
          Dealer
        </Button>
        
        <Button
          variant={currentTheme === 'tv' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleThemeChange('tv')}
          className="flex items-center gap-2 flex-1"
        >
          <Monitor className="w-4 h-4" />
          TV Display
        </Button>
      </div>
      
      <div className="mt-2 text-xs text-muted-foreground">
        {currentTheme === 'dealer' 
          ? 'Clean interface optimized for dealer use' 
          : 'Flashy display optimized for audience viewing'
        }
      </div>
    </Card>
  );
}
