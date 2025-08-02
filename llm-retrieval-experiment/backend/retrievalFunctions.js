import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const explicitMemory = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/explicitMemory.json'), 'utf-8')
);

const precomputedStats = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/precomputedStatistics.json'), 'utf-8')
);

export const retrievalFunctions = {
  findProductsByAssumption: {
    name: 'findProductsByAssumption',
    description: '특정 가정(assumption)에 연결된 모든 상품을 찾습니다. 가정 변경 시 영향받는 상품을 파악할 때 사용합니다.',
    category: 'explicit_memory',
    execute: (params) => {
      const { assumptionName } = params;
      const results = [];
      
      explicitMemory.productAssumptionConnections.forEach(product => {
        const matchingAssumptions = product.assumptions.filter(
          assumption => assumption.assumptionName.includes(assumptionName)
        );
        
        if (matchingAssumptions.length > 0) {
          results.push({
            productId: product.productId,
            productName: product.productName,
            productType: product.productType,
            matchingAssumptions: matchingAssumptions
          });
        }
      });
      
      return {
        functionUsed: 'findProductsByAssumption',
        category: 'explicit_memory',
        results,
        executionTime: new Date().toISOString()
      };
    }
  },

  getProductDesignHistory: {
    name: 'getProductDesignHistory',
    description: '특정 상품의 설계 이력을 조회합니다. 상품의 변경 내역과 담당자 정보를 확인할 때 사용합니다.',
    category: 'explicit_memory',
    execute: (params) => {
      const { productName } = params;
      const results = [];
      
      explicitMemory.productAssumptionConnections.forEach(product => {
        if (product.productName.includes(productName)) {
          results.push({
            productId: product.productId,
            productName: product.productName,
            designHistory: product.designHistory
          });
        }
      });
      
      return {
        functionUsed: 'getProductDesignHistory',
        category: 'explicit_memory',
        results,
        executionTime: new Date().toISOString()
      };
    }
  },

  getAssumptionRelationships: {
    name: 'getAssumptionRelationships',
    description: '가정들 간의 관계와 영향도를 조회합니다. 가정 변경의 파급 효과를 분석할 때 사용합니다.',
    category: 'explicit_memory',
    execute: (params) => {
      const { assumptionId } = params;
      
      if (assumptionId) {
        const relationship = explicitMemory.assumptionRelationships.find(
          rel => rel.assumptionId === assumptionId
        );
        return {
          functionUsed: 'getAssumptionRelationships',
          category: 'explicit_memory',
          results: relationship ? [relationship] : [],
          executionTime: new Date().toISOString()
        };
      }
      
      return {
        functionUsed: 'getAssumptionRelationships',
        category: 'explicit_memory',
        results: explicitMemory.assumptionRelationships,
        executionTime: new Date().toISOString()
      };
    }
  },

  getProductPremiumStatistics: {
    name: 'getProductPremiumStatistics',
    description: '특정 상품군의 보험료 통계를 조회합니다. 평균 보험료, 최소/최대값 등의 통계 정보를 제공합니다.',
    category: 'precomputed_statistics',
    execute: (params) => {
      const { year, productType } = params;
      const results = [];
      
      if (year && precomputedStats.productStatistics[year]) {
        const yearData = precomputedStats.productStatistics[year];
        
        if (productType === 'thyroidCancer') {
          yearData.thyroidCancerProducts.forEach(product => {
            results.push({
              productId: product.productId,
              productName: product.productName,
              premiumStats: product.premiumStats
            });
          });
        } else {
          yearData.allHealthProducts.forEach(product => {
            results.push({
              productId: product.productId,
              productName: product.productName,
              premiumStats: product.premiumStats
            });
          });
        }
      }
      
      return {
        functionUsed: 'getProductPremiumStatistics',
        category: 'precomputed_statistics',
        results,
        executionTime: new Date().toISOString()
      };
    }
  },

  getFinancialMetrics: {
    name: 'getFinancialMetrics',
    description: '상품의 재무 지표(IRR, 수익률, 손해율 등)를 조회합니다.',
    category: 'precomputed_statistics',
    execute: (params) => {
      const { year, productName } = params;
      const results = [];
      
      if (year && precomputedStats.productStatistics[year]) {
        const yearData = precomputedStats.productStatistics[year];
        const allProducts = [...yearData.thyroidCancerProducts, ...yearData.allHealthProducts];
        
        allProducts.forEach(product => {
          if (!productName || product.productName.includes(productName)) {
            results.push({
              productId: product.productId,
              productName: product.productName,
              financialMetrics: product.financialMetrics
            });
          }
        });
      }
      
      return {
        functionUsed: 'getFinancialMetrics',
        category: 'precomputed_statistics',
        results,
        executionTime: new Date().toISOString()
      };
    }
  },

  getRiskMetrics: {
    name: 'getRiskMetrics',
    description: '상품의 리스크 지표(클레임 빈도, 평균 클레임 금액 등)를 조회합니다.',
    category: 'precomputed_statistics',
    execute: (params) => {
      const { year, productType } = params;
      const results = [];
      
      if (year && precomputedStats.productStatistics[year]) {
        const yearData = precomputedStats.productStatistics[year];
        const allProducts = [...yearData.thyroidCancerProducts, ...yearData.allHealthProducts];
        
        allProducts.forEach(product => {
          results.push({
            productId: product.productId,
            productName: product.productName,
            riskMetrics: product.riskMetrics
          });
        });
      }
      
      return {
        functionUsed: 'getRiskMetrics',
        category: 'precomputed_statistics',
        results,
        executionTime: new Date().toISOString()
      };
    }
  },

  getAggregatedStatsByType: {
    name: 'getAggregatedStatsByType',
    description: '상품 유형별 집계 통계를 조회합니다. 전체 계약 수, 평균 보험료 등을 제공합니다.',
    category: 'precomputed_statistics',
    execute: (params) => {
      const { productType } = params;
      
      if (productType && precomputedStats.aggregatedStatistics.byProductType[productType]) {
        return {
          functionUsed: 'getAggregatedStatsByType',
          category: 'precomputed_statistics',
          results: [precomputedStats.aggregatedStatistics.byProductType[productType]],
          executionTime: new Date().toISOString()
        };
      }
      
      return {
        functionUsed: 'getAggregatedStatsByType',
        category: 'precomputed_statistics',
        results: [precomputedStats.aggregatedStatistics.byProductType],
        executionTime: new Date().toISOString()
      };
    }
  },

  getYearlyStatistics: {
    name: 'getYearlyStatistics',
    description: '연도별 전체 통계를 조회합니다. 신규 계약 수, 총 보험료 등을 제공합니다.',
    category: 'precomputed_statistics',
    execute: (params) => {
      const { year } = params;
      
      if (year && precomputedStats.aggregatedStatistics.byYear[year]) {
        return {
          functionUsed: 'getYearlyStatistics',
          category: 'precomputed_statistics',
          results: [{
            year,
            statistics: precomputedStats.aggregatedStatistics.byYear[year]
          }],
          executionTime: new Date().toISOString()
        };
      }
      
      return {
        functionUsed: 'getYearlyStatistics',
        category: 'precomputed_statistics',
        results: Object.entries(precomputedStats.aggregatedStatistics.byYear).map(([year, stats]) => ({
          year,
          statistics: stats
        })),
        executionTime: new Date().toISOString()
      };
    }
  },

  searchProductByKeyword: {
    name: 'searchProductByKeyword',
    description: '키워드로 상품을 검색합니다. 상품명, 상품 유형 등으로 검색 가능합니다.',
    category: 'explicit_memory',
    execute: (params) => {
      const { keyword } = params;
      const results = [];
      
      explicitMemory.productAssumptionConnections.forEach(product => {
        if (product.productName.includes(keyword) || 
            product.productType.toLowerCase().includes(keyword.toLowerCase())) {
          results.push({
            productId: product.productId,
            productName: product.productName,
            productType: product.productType
          });
        }
      });
      
      return {
        functionUsed: 'searchProductByKeyword',
        category: 'explicit_memory',
        results,
        executionTime: new Date().toISOString()
      };
    }
  },

  getContractStatistics: {
    name: 'getContractStatistics',
    description: '계약 관련 통계(총 계약 수, 신규 계약, 해약 등)를 조회합니다.',
    category: 'precomputed_statistics',
    execute: (params) => {
      const { year, productName } = params;
      const results = [];
      
      if (year && precomputedStats.productStatistics[year]) {
        const yearData = precomputedStats.productStatistics[year];
        const allProducts = [...yearData.thyroidCancerProducts, ...yearData.allHealthProducts];
        
        allProducts.forEach(product => {
          if (!productName || product.productName.includes(productName)) {
            results.push({
              productId: product.productId,
              productName: product.productName,
              contractStats: product.contractStats
            });
          }
        });
      }
      
      return {
        functionUsed: 'getContractStatistics',
        category: 'precomputed_statistics',
        results,
        executionTime: new Date().toISOString()
      };
    }
  }
};

export function getFunctionDescriptions() {
  return Object.entries(retrievalFunctions).map(([key, func]) => ({
    name: func.name,
    description: func.description,
    category: func.category
  }));
}