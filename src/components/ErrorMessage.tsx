import React from 'react';

interface ErrorMessageProps {
  title: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  title, 
  message, 
  onRetry,
  showRetry = true 
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4 p-6">
      <div className="text-6xl">⚠️</div>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-[var(--tg-theme-text-color)]">
          {title}
        </h2>
        <p className="text-[var(--tg-theme-hint-color)] max-w-sm">
          {message}
        </p>
      </div>
      
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

