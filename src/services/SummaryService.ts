import { DatabaseManager } from '../database/Database.js';
import { OpportunityConfirmationService, ConfirmedOpportunity } from './OpportunityConfirmationService.js';
import { AIAnalysisService } from './AIAnalysisService.js';
import { i18n } from '../utils/i18n.js';
import { ArbitrageOpportunity } from '../exchanges/types/index.js';

export class SummaryService {
  private static instance: SummaryService;
  private db: DatabaseManager;
  private confirmationService: OpportunityConfirmationService;
  private aiService: AIAnalysisService;

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.confirmationService = OpportunityConfirmationService.getInstance();
    this.aiService = AIAnalysisService.getInstance();
  }

  public static getInstance(): SummaryService {
    if (!SummaryService.instance) {
      SummaryService.instance = new SummaryService();
    }
    return SummaryService.instance;
  }

  /**
   * Get opportunities from the last 4 hours
   */
  private async getRecentOpportunities(): Promise<ArbitrageOpportunity[]> {
    try {
      const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(4 * 60); // 4 hours in minutes
      return opportunities || [];
    } catch (error) {
      console.error('Error fetching recent opportunities:', error);
      return [];
    }
  }

  /**
   * Get top 5 most profitable opportunities from recent data
   */
  private getTopOpportunities(opportunities: ArbitrageOpportunity[], limit: number = 5): ArbitrageOpportunity[] {
    return opportunities
      .filter(opp => opp.profitPercentage > 1.0) // Minimum 1% profit
      .sort((a, b) => b.profitPercentage - a.profitPercentage)
      .slice(0, limit);
  }

  /**
   * Format opportunity details for summary
   */
  private formatOpportunityDetails(opp: ArbitrageOpportunity, index: number): string {
    return `${index + 1}. **${opp.symbol}**
   📈 ${opp.profitPercentage.toFixed(2)}% прибыль
   💰 Купить: ${opp.buyExchange} ($${opp.buyPrice.toFixed(4)})
   💸 Продать: ${opp.sellExchange} ($${opp.sellPrice.toFixed(4)})
   📊 Объем: $${opp.volume.toFixed(2)}`;
  }

  /**
   * Generate 4-hour summary with confirmed opportunities and AI analysis
   */
  async generate4HourSummary(): Promise<string> {
    try {
      // Get recent opportunities
      const recentOpportunities = await this.getRecentOpportunities();
      
      if (recentOpportunities.length === 0) {
        return i18n.t('summary.no_opportunities', 'ru');
      }

      // Get top 5 most profitable
      const topOpportunities = this.getTopOpportunities(recentOpportunities, 5);
      
      if (topOpportunities.length === 0) {
        return i18n.t('summary.no_profitable_opportunities', 'ru');
      }

      // Confirm opportunities and get AI analysis in parallel
      const confirmedResults = await this.confirmationService.batchConfirmOpportunities(topOpportunities);
      
      // Filter only confirmed opportunities
      const confirmedOpportunities = confirmedResults.filter(result => result.isConfirmed);
      
      if (confirmedOpportunities.length === 0) {
        return i18n.t('summary.no_confirmed_opportunities', 'ru');
      }

      // Generate summary header
      const summaryHeader = `📊 **4-часовой отчет арбитража**
⏰ Период: последние 4 часа
📈 Найдено возможностей: ${recentOpportunities.length}
✅ Подтвержденных: ${confirmedOpportunities.length}/${topOpportunities.length}

**Топ ${confirmedOpportunities.length} подтвержденных возможностей:**
`;

      // Generate opportunity details with AI analysis
      let summaryDetails = '';
      
      for (let i = 0; i < confirmedOpportunities.length; i++) {
        const result = confirmedOpportunities[i];
        const opp = result.opportunity;
        
        summaryDetails += `\n${this.formatOpportunityDetails(opp, i)}\n`;
        
        // Add AI analysis if available
        if (result.aiAnalysis) {
          summaryDetails += `💡 **AI Анализ:**\n${result.aiAnalysis}\n`;
        }
        
        // Add confirmation status
        const confirmation = result.confirmationData;
        summaryDetails += `✅ **Подтверждение:** `;
        
        if (confirmation.contractIdMatch) summaryDetails += `Контракт ✓ `;
        if (confirmation.chainIdMatch) summaryDetails += `Сеть ✓ `;
        if (confirmation.liquidityValid) summaryDetails += `Ликвидность ✓ `;
        if (confirmation.volumeValid) summaryDetails += `Объем ✓ `;
        
        summaryDetails += '\n';
      }

      // Add summary footer
      const summaryFooter = `\n📈 **Статистика:**
Средняя прибыль: ${this.calculateAverageProfit(confirmedOpportunities).toFixed(2)}%
Максимальная прибыль: ${this.calculateMaxProfit(confirmedOpportunities).toFixed(2)}%
Общий объем: $${this.calculateTotalVolume(confirmedOpportunities).toFixed(2)}`;

      return summaryHeader + summaryDetails + summaryFooter;

    } catch (error) {
      console.error('Error generating 4-hour summary:', error);
      return `❌ Ошибка генерации отчета: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }

  /**
   * Calculate average profit from confirmed opportunities
   */
  private calculateAverageProfit(opportunities: ConfirmedOpportunity[]): number {
    if (opportunities.length === 0) return 0;
    
    const totalProfit = opportunities.reduce((sum, result) => 
      sum + result.opportunity.profitPercentage, 0
    );
    
    return totalProfit / opportunities.length;
  }

  /**
   * Calculate maximum profit from confirmed opportunities
   */
  private calculateMaxProfit(opportunities: ConfirmedOpportunity[]): number {
    if (opportunities.length === 0) return 0;
    
    return Math.max(...opportunities.map(result => result.opportunity.profitPercentage));
  }

  /**
   * Calculate total volume from confirmed opportunities
   */
  private calculateTotalVolume(opportunities: ConfirmedOpportunity[]): number {
    return opportunities.reduce((sum, result) => 
      sum + (result.opportunity.volume || 0), 0
    );
  }

  /**
   * Generate summary for Telegram message (with Markdown formatting)
   */
  async generateTelegramSummary(): Promise<string> {
    const summary = await this.generate4HourSummary();
    // Ensure proper Markdown formatting for Telegram
    return summary.replace(/\*\*/g, '*').replace(/\n/g, '\n');
  }

  /**
   * Get summary statistics for monitoring
   */
  async getSummaryStats(): Promise<{
    totalOpportunities: number;
    confirmedOpportunities: number;
    averageProfit: number;
    maxProfit: number;
    totalVolume: number;
    confirmationRate: number;
  }> {
    const recentOpportunities = await this.getRecentOpportunities();
    const topOpportunities = this.getTopOpportunities(recentOpportunities, 10);
    const confirmedResults = await this.confirmationService.batchConfirmOpportunities(topOpportunities);
    const confirmedOpportunities = confirmedResults.filter(result => result.isConfirmed);

    return {
      totalOpportunities: recentOpportunities.length,
      confirmedOpportunities: confirmedOpportunities.length,
      averageProfit: this.calculateAverageProfit(confirmedOpportunities),
      maxProfit: this.calculateMaxProfit(confirmedOpportunities),
      totalVolume: this.calculateTotalVolume(confirmedOpportunities),
      confirmationRate: topOpportunities.length > 0 ? confirmedOpportunities.length / topOpportunities.length : 0
    };
  }
}
