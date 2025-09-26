import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div 
        className={`${sizeClasses[size]} border-4 border-[var(--tg-theme-secondary-bg-color)] border-t-[var(--tg-theme-button-color)] rounded-full animate-spin`}
      />
      <p className={`${textSizeClasses[size]} text-[var(--tg-theme-hint-color)]`}>
        {message}
      </p>
    </div>
  );
};

