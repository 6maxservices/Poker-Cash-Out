
export type AppTheme = 'dealer' | 'tv';

export const setAppTheme = (theme: AppTheme) => {
  const body = document.body;
  
  // Remove all theme classes
  body.classList.remove('dealer-theme', 'tv-theme');
  
  // Add the appropriate theme class
  if (theme === 'tv') {
    body.classList.add('tv-theme');
  } else {
    body.classList.add('dealer-theme');
  }
};

export const getThemeClasses = (theme: AppTheme) => {
  const baseClasses = 'min-h-screen transition-all duration-500';
  
  if (theme === 'tv') {
    return `${baseClasses} tv-theme`;
  }
  
  return `${baseClasses} dealer-theme`;
};

export const formatCurrencyForTheme = (amount: number, theme: AppTheme): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  return formatter.format(amount);
};

// Component-specific theme utilities
export const getCardThemeClasses = (theme: AppTheme, isSelected?: boolean) => {
  const baseClasses = 'rounded-lg transition-all duration-300';
  
  if (theme === 'tv') {
    return `${baseClasses} tv-card ${isSelected ? 'tv-winning-player' : ''}`;
  }
  
  return `${baseClasses} dealer-card ${isSelected ? 'border-green-600' : ''}`;
};

export const getButtonThemeClasses = (theme: AppTheme, variant: 'primary' | 'secondary' = 'primary') => {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 touch-friendly no-touch-highlight';
  
  if (theme === 'tv') {
    if (variant === 'primary') {
      return `${baseClasses} bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 px-8 text-lg tv-glow`;
    }
    return `${baseClasses} bg-gray-800/80 hover:bg-gray-700/80 text-white border border-purple-500/50 py-3 px-6`;
  }
  
  if (variant === 'primary') {
    return `${baseClasses} dealer-button`;
  }
  return `${baseClasses} bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300 py-3 px-6`;
};
