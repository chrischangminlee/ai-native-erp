import explicitMemory from './data/explicitMemory.json';
import precomputedStats from './data/precomputedStatistics.json';

/**
 * Standardized Retrieval Functions with Clear Contracts
 * 
 * Design Principles:
 * 1. Each function has a single, clear purpose
 * 2. Parameters are strongly typed and validated
 * 3. Return format is consistent and predictable
 * 4. No interpretation - just data retrieval
 */

// Helper function to validate required parameters
function validateParams(params, required) {
  for (const param of required) {
    if (!params[param]) {
      return {
        error: true,
        message: `Missing required parameter: ${param}`,
        requiredParams: required
      };
    }
  }
  return null;
}

export const retrievalFunctions = {
  /**
   * Get products affected by assumption changes
   * @param {Object} params
   * @param {string} params.assumptionType - Required: "발생률" | "사망률" | "해약률" | "할인율"
   * @param {string} params.assumptionDetail - Optional: specific assumption like "갑상선암"
   * @returns {Object} Standardized response with affected products
   */
  getProductsAffectedByAssumption: {
    name: 'getProductsAffectedByAssumption',
    description: '특정 가정 변경 시 영향받는 상품 목록을 조회합니다',
    category: 'explicit_memory',
    requiredParams: ['assumptionType'],
    optionalParams: ['assumptionDetail'],
    execute: (params) => {
      const validation = validateParams(params, ['assumptionType']);
      if (validation) return validation;

      const { assumptionType, assumptionDetail } = params;
      const affectedProducts = [];

      explicitMemory.productAssumptionConnections.forEach(product => {
        const matchingAssumptions = product.assumptions.filter(assumption => {
          const typeMatch = assumption.category === assumptionType;
          const detailMatch = !assumptionDetail || 
            assumption.assumptionName.includes(assumptionDetail);
          return typeMatch && detailMatch;
        });

        if (matchingAssumptions.length > 0) {
          affectedProducts.push({
            productId: product.productId,
            productName: product.productName,
            productType: product.productType,
            affectedAssumptions: matchingAssumptions.map(a => ({
              name: a.assumptionName,
              currentValue: a.baseValue,
              unit: a.unit
            }))
          });
        }
      });

      return {
        success: true,
        queryType: 'assumption_impact',
        parameters: { assumptionType, assumptionDetail },
        resultCount: affectedProducts.length,
        data: affectedProducts
      };
    }
  },

  /**
   * Get financial metrics for products
   * @param {Object} params
   * @param {string} params.year - Required: "2023" | "2024"
   * @param {string} params.metricType - Required: "IRR" | "profitMargin" | "lossRatio"
   * @param {string} params.productCategory - Optional: "thyroidCancer" | "health"
   * @param {number} params.threshold - Optional: filter by metric value
   * @param {string} params.comparison - Optional: "above" | "below" (used with threshold)
   */
  getFinancialMetricsByFilter: {
    name: 'getFinancialMetricsByFilter',
    description: '특정 조건의 재무 지표를 가진 상품을 조회합니다',
    category: 'precomputed_statistics',
    requiredParams: ['year', 'metricType'],
    optionalParams: ['productCategory', 'threshold', 'comparison'],
    execute: (params) => {
      const validation = validateParams(params, ['year', 'metricType']);
      if (validation) return validation;

      const { year, metricType, productCategory, threshold, comparison } = params;
      const matchingProducts = [];

      if (!precomputedStats.productStatistics[year]) {
        return {
          success: false,
          message: `No data available for year ${year}`
        };
      }

      const yearData = precomputedStats.productStatistics[year];
      let productsToCheck = [];

      // Filter by category if specified
      if (productCategory === 'thyroidCancer') {
        productsToCheck = yearData.thyroidCancerProducts;
      } else if (productCategory === 'health') {
        productsToCheck = yearData.allHealthProducts;
      } else {
        productsToCheck = [...yearData.thyroidCancerProducts, ...yearData.allHealthProducts];
      }

      productsToCheck.forEach(product => {
        const metricValue = product.financialMetrics[metricType];
        
        if (metricValue !== undefined) {
          let includeProduct = true;
          
          if (threshold !== undefined && comparison) {
            includeProduct = comparison === 'above' 
              ? metricValue > threshold 
              : metricValue < threshold;
          }

          if (includeProduct) {
            matchingProducts.push({
              productId: product.productId,
              productName: product.productName,
              [metricType]: metricValue,
              allFinancialMetrics: product.financialMetrics
            });
          }
        }
      });

      return {
        success: true,
        queryType: 'financial_metrics',
        parameters: params,
        resultCount: matchingProducts.length,
        data: matchingProducts
      };
    }
  },

  /**
   * Get design history by designer or date range
   * @param {Object} params
   * @param {string} params.designer - Optional: designer name
   * @param {string} params.startDate - Optional: YYYY-MM-DD format
   * @param {string} params.endDate - Optional: YYYY-MM-DD format
   * @param {string} params.productId - Optional: specific product
   */
  getDesignHistoryByFilter: {
    name: 'getDesignHistoryByFilter',
    description: '설계자, 날짜, 상품별로 설계 이력을 조회합니다',
    category: 'explicit_memory',
    requiredParams: [], // All params are optional but at least one should be provided
    optionalParams: ['designer', 'startDate', 'endDate', 'productId'],
    execute: (params) => {
      const { designer, startDate, endDate, productId } = params;
      
      if (!designer && !startDate && !endDate && !productId) {
        return {
          error: true,
          message: 'At least one filter parameter is required',
          availableParams: ['designer', 'startDate', 'endDate', 'productId']
        };
      }

      const matchingHistory = [];

      explicitMemory.productAssumptionConnections.forEach(product => {
        if (productId && product.productId !== productId) return;

        const relevantHistory = product.designHistory.filter(history => {
          let match = true;
          
          if (designer) {
            match = match && history.designer === designer;
          }
          
          if (startDate) {
            match = match && history.date >= startDate;
          }
          
          if (endDate) {
            match = match && history.date <= endDate;
          }
          
          return match;
        });

        if (relevantHistory.length > 0) {
          matchingHistory.push({
            productId: product.productId,
            productName: product.productName,
            history: relevantHistory
          });
        }
      });

      return {
        success: true,
        queryType: 'design_history',
        parameters: params,
        resultCount: matchingHistory.length,
        data: matchingHistory
      };
    }
  },

  /**
   * Compare products by multiple metrics
   * @param {Object} params
   * @param {string[]} params.productIds - Required: array of product IDs to compare
   * @param {string} params.year - Required: year for statistics
   * @param {string[]} params.metrics - Optional: specific metrics to compare
   */
  compareProducts: {
    name: 'compareProducts',
    description: '여러 상품을 다양한 지표로 비교합니다',
    category: 'precomputed_statistics',
    requiredParams: ['productIds', 'year'],
    optionalParams: ['metrics'],
    execute: (params) => {
      const validation = validateParams(params, ['productIds', 'year']);
      if (validation) return validation;

      const { productIds, year, metrics } = params;
      const comparisonData = [];

      if (!precomputedStats.productStatistics[year]) {
        return {
          success: false,
          message: `No data available for year ${year}`
        };
      }

      const yearData = precomputedStats.productStatistics[year];
      const allProducts = [...yearData.thyroidCancerProducts, ...yearData.allHealthProducts];

      productIds.forEach(productId => {
        const product = allProducts.find(p => p.productId === productId);
        if (product) {
          const productComparison = {
            productId: product.productId,
            productName: product.productName,
            premiumStats: product.premiumStats,
            financialMetrics: product.financialMetrics,
            contractStats: product.contractStats,
            riskMetrics: product.riskMetrics
          };

          // Filter to specific metrics if requested
          if (metrics && metrics.length > 0) {
            const filteredComparison = {
              productId: product.productId,
              productName: product.productName
            };
            
            metrics.forEach(metric => {
              if (product.premiumStats[metric]) {
                filteredComparison[metric] = product.premiumStats[metric];
              } else if (product.financialMetrics[metric]) {
                filteredComparison[metric] = product.financialMetrics[metric];
              } else if (product.contractStats[metric]) {
                filteredComparison[metric] = product.contractStats[metric];
              } else if (product.riskMetrics[metric]) {
                filteredComparison[metric] = product.riskMetrics[metric];
              }
            });
            
            comparisonData.push(filteredComparison);
          } else {
            comparisonData.push(productComparison);
          }
        }
      });

      return {
        success: true,
        queryType: 'product_comparison',
        parameters: params,
        resultCount: comparisonData.length,
        data: comparisonData
      };
    }
  },

  /**
   * Get year-over-year performance
   * @param {Object} params
   * @param {string} params.baseYear - Required: base year for comparison
   * @param {string} params.compareYear - Required: year to compare against
   * @param {string} params.productCategory - Optional: filter by category
   */
  getYearOverYearPerformance: {
    name: 'getYearOverYearPerformance',
    description: '연도별 실적을 비교합니다',
    category: 'precomputed_statistics',
    requiredParams: ['baseYear', 'compareYear'],
    optionalParams: ['productCategory'],
    execute: (params) => {
      const validation = validateParams(params, ['baseYear', 'compareYear']);
      if (validation) return validation;

      const { baseYear, compareYear, productCategory } = params;
      
      const baseYearStats = precomputedStats.aggregatedStatistics.byYear[baseYear];
      const compareYearStats = precomputedStats.aggregatedStatistics.byYear[compareYear];

      if (!baseYearStats || !compareYearStats) {
        return {
          success: false,
          message: 'Data not available for one or both years'
        };
      }

      const comparison = {
        baseYear: {
          year: baseYear,
          totalContracts: baseYearStats.totalNewContracts,
          totalPremium: baseYearStats.totalPremiumCollected,
          averageIRR: baseYearStats.averageIRR
        },
        compareYear: {
          year: compareYear,
          totalContracts: compareYearStats.totalNewContracts,
          totalPremium: compareYearStats.totalPremiumCollected,
          averageIRR: compareYearStats.averageIRR
        },
        growth: {
          contractsGrowth: ((compareYearStats.totalNewContracts - baseYearStats.totalNewContracts) / baseYearStats.totalNewContracts * 100).toFixed(2) + '%',
          premiumGrowth: ((compareYearStats.totalPremiumCollected - baseYearStats.totalPremiumCollected) / baseYearStats.totalPremiumCollected * 100).toFixed(2) + '%',
          irrChange: (compareYearStats.averageIRR - baseYearStats.averageIRR).toFixed(3)
        }
      };

      return {
        success: true,
        queryType: 'year_over_year',
        parameters: params,
        data: comparison
      };
    }
  }
};

// Helper function to get function info for LLM
export function getFunctionDescriptions() {
  return Object.entries(retrievalFunctions).map(([key, func]) => ({
    name: func.name,
    description: func.description,
    category: func.category,
    requiredParams: func.requiredParams,
    optionalParams: func.optionalParams
  }));
}