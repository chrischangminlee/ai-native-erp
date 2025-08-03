import explicitMemory from './data/explicitProductAssumptionMemory.json';
import precomputedStats from './data/precomputedStatistics.json';

/**
 * Generic Retrieval Functions for Demo V4
 * 
 * Design Principles:
 * 1. Functions are generic and key-based
 * 2. No natural language processing in functions
 * 3. Return structured data that LLM can interpret
 */

export const retrievalFunctions = {
  /**
   * Get products affected by an assumption
   * Key: assumptionCode
   * Returns: List of affected products with details
   */
  getProductsByAssumption: {
    name: 'getProductsByAssumption',
    description: '특정 가정(assumption)에 영향받는 상품 목록을 반환합니다',
    requiredKeys: ['assumptionCode'],
    dataSource: 'explicitMemory',
    execute: ({ assumptionCode }) => {
      const assumptionData = explicitMemory.assumptionProductMappings[assumptionCode];
      
      if (!assumptionData) {
        return {
          success: false,
          error: `Assumption code ${assumptionCode} not found`,
          data: null
        };
      }
      
      return {
        success: true,
        data: {
          assumptionCode,
          assumptionName: assumptionData.assumptionName,
          assumptionCategory: assumptionData.assumptionCategory,
          affectedProducts: assumptionData.affectedProducts
        }
      };
    }
  },

  /**
   * Get assumptions for a product
   * Key: productCode
   * Returns: List of assumptions used by the product
   */
  getAssumptionsByProduct: {
    name: 'getAssumptionsByProduct',
    description: '특정 상품이 사용하는 가정(assumption) 목록을 반환합니다',
    requiredKeys: ['productCode'],
    dataSource: 'explicitMemory',
    execute: ({ productCode }) => {
      const productData = explicitMemory.productAssumptionProfiles[productCode];
      
      if (!productData) {
        return {
          success: false,
          error: `Product code ${productCode} not found`,
          data: null
        };
      }
      
      // Get detailed assumption info
      const assumptions = productData.assumptions.map(assumptionCode => {
        const assumptionInfo = explicitMemory.assumptionProductMappings[assumptionCode];
        return {
          assumptionCode,
          assumptionName: assumptionInfo?.assumptionName || 'Unknown',
          assumptionCategory: assumptionInfo?.assumptionCategory || 'Unknown'
        };
      });
      
      return {
        success: true,
        data: {
          productCode,
          productName: productData.productName,
          launchDate: productData.launchDate,
          lastReview: productData.lastReview,
          assumptions
        }
      };
    }
  },

  /**
   * Get product profitability metrics
   * Keys: year, productCode (optional)
   * Returns: Premium collected and claims paid
   */
  getProductProfitability: {
    name: 'getProductProfitability',
    description: '상품의 수익성 지표(보험료 및 보험금)를 반환합니다',
    requiredKeys: ['year'],
    optionalKeys: ['productCode'],
    dataSource: 'precomputedStats',
    execute: ({ year, productCode }) => {
      // If specific product requested
      if (productCode) {
        const productData = precomputedStats.productYearlyMetrics[productCode];
        if (!productData || !productData.yearlyData[year]) {
          return {
            success: false,
            error: `No data found for product ${productCode} in year ${year}`,
            data: null
          };
        }
        
        const yearData = productData.yearlyData[year];
        return {
          success: true,
          data: {
            productCode,
            productName: productData.productName,
            year,
            totalPremiumCollected: yearData.premiumStatistics.totalPremiumCollected,
            totalClaimsPaid: yearData.claimStatistics.totalClaimsPaid,
            lossRatio: yearData.profitability.lossRatio,
            underwritingProfit: yearData.profitability.underwritingProfit
          }
        };
      }
      
      // All products for the year
      const productsData = [];
      Object.entries(precomputedStats.productYearlyMetrics).forEach(([code, product]) => {
        if (product.yearlyData[year]) {
          const yearData = product.yearlyData[year];
          productsData.push({
            productCode: code,
            productName: product.productName,
            totalPremiumCollected: yearData.premiumStatistics.totalPremiumCollected,
            totalClaimsPaid: yearData.claimStatistics.totalClaimsPaid,
            lossRatio: yearData.profitability.lossRatio,
            underwritingProfit: yearData.profitability.underwritingProfit
          });
        }
      });
      
      if (productsData.length === 0) {
        return {
          success: false,
          error: `No products found with data for year ${year}`,
          data: null
        };
      }
      
      return {
        success: true,
        data: {
          year,
          products: productsData,
          summary: precomputedStats.aggregatedMetrics.byYear[year]
        }
      };
    }
  },

  /**
   * Get premium statistics across years
   * Key: productCode
   * Returns: Year-by-year premium statistics
   */
  getPremiumStatisticsByProduct: {
    name: 'getPremiumStatisticsByProduct',
    description: '특정 상품의 연도별 보험료 통계를 반환합니다',
    requiredKeys: ['productCode'],
    dataSource: 'precomputedStats',
    execute: ({ productCode }) => {
      const productData = precomputedStats.productYearlyMetrics[productCode];
      
      if (!productData) {
        return {
          success: false,
          error: `Product code ${productCode} not found`,
          data: null
        };
      }
      
      const yearlyStats = [];
      Object.entries(productData.yearlyData).forEach(([year, data]) => {
        yearlyStats.push({
          year,
          totalPremiumCollected: data.premiumStatistics.totalPremiumCollected,
          averageMonthlyPremium: data.premiumStatistics.averageMonthlyPremium,
          contractCount: data.premiumStatistics.contractCount,
          newContracts: data.premiumStatistics.newContracts,
          terminatedContracts: data.premiumStatistics.terminatedContracts
        });
      });
      
      return {
        success: true,
        data: {
          productCode,
          productName: productData.productName,
          yearlyStatistics: yearlyStats
        }
      };
    }
  },

  /**
   * Get aggregated metrics
   * Key: aggregationType ('year' or 'category'), value (year or category name)
   * Returns: Aggregated statistics
   */
  getAggregatedMetrics: {
    name: 'getAggregatedMetrics',
    description: '연도별 또는 상품 카테고리별 집계 지표를 반환합니다',
    requiredKeys: ['aggregationType', 'value'],
    dataSource: 'precomputedStats',
    execute: ({ aggregationType, value }) => {
      if (aggregationType === 'year') {
        const yearData = precomputedStats.aggregatedMetrics.byYear[value];
        if (!yearData) {
          return {
            success: false,
            error: `No aggregated data found for year ${value}`,
            data: null
          };
        }
        return {
          success: true,
          data: {
            type: 'year',
            value,
            metrics: yearData
          }
        };
      }
      
      if (aggregationType === 'category') {
        const categoryData = precomputedStats.aggregatedMetrics.byProductCategory[value];
        if (!categoryData) {
          return {
            success: false,
            error: `No aggregated data found for category ${value}`,
            data: null
          };
        }
        return {
          success: true,
          data: {
            type: 'category',
            value,
            metrics: categoryData
          }
        };
      }
      
      return {
        success: false,
        error: `Invalid aggregation type: ${aggregationType}`,
        data: null
      };
    }
  }
};

// Helper function to get all available functions info
export function getFunctionDescriptions() {
  return Object.entries(retrievalFunctions).map(([name, func]) => ({
    name: func.name,
    description: func.description,
    requiredKeys: func.requiredKeys,
    optionalKeys: func.optionalKeys || [],
    dataSource: func.dataSource
  }));
}