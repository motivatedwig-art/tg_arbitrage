/**
 * Utility for color-coded profit indicators
 * Provides consistent color schemes based on profit percentages
 */
/**
 * Get color scheme based on profit percentage
 */
export function getProfitColor(profitPercentage) {
    if (profitPercentage >= 3) {
        return {
            textColor: '#059669', // emerald-600
            backgroundColor: 'rgba(5, 150, 105, 0.1)', // emerald-600 with opacity
            borderColor: '#10b981' // emerald-500
        };
    }
    if (profitPercentage >= 2) {
        return {
            textColor: '#16a34a', // green-600
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            borderColor: '#22c55e' // green-500
        };
    }
    if (profitPercentage >= 1) {
        return {
            textColor: '#ca8a04', // yellow-600
            backgroundColor: 'rgba(202, 138, 4, 0.1)',
            borderColor: '#eab308' // yellow-500
        };
    }
    return {
        textColor: '#6b7280', // gray-500
        backgroundColor: 'rgba(107, 114, 128, 0.05)',
        borderColor: '#9ca3af' // gray-400
    };
}
/**
 * Get row styling based on profit percentage
 */
export function getProfitRowStyles(profitPercentage) {
    const colors = getProfitColor(profitPercentage);
    return {
        style: {
            backgroundColor: colors.backgroundColor,
            borderLeft: `4px solid ${colors.borderColor}`
        },
        className: `profit-${profitPercentage >= 3
            ? 'high'
            : profitPercentage >= 2
                ? 'medium'
                : profitPercentage >= 1
                    ? 'low'
                    : 'minimal'}`
    };
}
/**
 * Get profit badge colors (for display badges)
 */
export function getProfitBadgeColors(profitPercentage) {
    if (profitPercentage >= 3) {
        return { bg: '#059669', text: '#ffffff' };
    }
    if (profitPercentage >= 2) {
        return { bg: '#16a34a', text: '#ffffff' };
    }
    if (profitPercentage >= 1) {
        return { bg: '#ca8a04', text: '#ffffff' };
    }
    return { bg: '#6b7280', text: '#ffffff' };
}
//# sourceMappingURL=profitColors.js.map