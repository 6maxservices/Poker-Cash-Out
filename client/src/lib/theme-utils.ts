
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
  const baseClasses = 'rounded-lg transition-all duration-300 border-2';
  
  if (theme === 'tv') {
    return `${baseClasses} bg-gray-900/95 backdrop-blur-sm border-purple-500/30 shadow-2xl ${isSelected ? 'tv-winning-player border-yellow-400' : ''}`;
  }
  
  return `${baseClasses} bg-white border-gray-200 shadow-sm hover:shadow-md ${isSelected ? 'border-green-600 shadow-lg' : ''}`;
};

export const getButtonThemeClasses = (theme: AppTheme, variant: 'primary' | 'secondary' = 'primary') => {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 touch-friendly no-touch-highlight border-2';
  
  if (theme === 'tv') {
    if (variant === 'primary') {
      return `${baseClasses} bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 px-8 text-lg border-purple-400 shadow-lg hover:shadow-xl`;
    }
    return `${baseClasses} bg-gray-800/90 hover:bg-gray-700/90 text-white border-purple-500/50 hover:border-purple-400 py-3 px-6`;
  }
  
  if (variant === 'primary') {
    return `${baseClasses} bg-green-700 hover:bg-green-800 text-white py-3 px-6 border-green-600 hover:border-green-700 shadow-sm hover:shadow-md`;
  }
  return `${baseClasses} bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300 hover:border-gray-400 py-3 px-6`;
};

export const getPotDisplayClasses = (theme: AppTheme) => {
  if (theme === 'tv') {
    return 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold text-3xl p-6 rounded-xl border-2 border-yellow-300 shadow-2xl';
  }
  
  return 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white font-bold text-2xl p-6 rounded-xl border-2 border-yellow-400 shadow-lg';
};
