/**
 * Utility for color-coded profit indicators
 * Provides consistent color schemes based on profit percentages
 */
export interface ProfitColors {
    textColor: string;
    backgroundColor: string;
    borderColor: string;
}
/**
 * Get color scheme based on profit percentage
 */
export declare function getProfitColor(profitPercentage: number): ProfitColors;
/**
 * Get row styling based on profit percentage
 */
export declare function getProfitRowStyles(profitPercentage: number): {
    style: {
        backgroundColor: string;
        borderLeft: string;
    };
    className: string;
};
/**
 * Get profit badge colors (for display badges)
 */
export declare function getProfitBadgeColors(profitPercentage: number): {
    bg: string;
    text: string;
};
//# sourceMappingURL=profitColors.d.ts.map