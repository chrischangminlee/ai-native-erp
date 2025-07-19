import { Link } from 'react-router-dom';
import { ShoppingCart, Package, Factory, DollarSign, ArrowRight } from 'lucide-react';

function Home() {
  const modules = [
    {
      title: '매출 현황',
      description: '매출액, 주문, 고객 분석 및 매출 예측 추적',
      icon: ShoppingCart,
      link: '/sales/dashboard',
      color: 'bg-blue-500',
      stats: ['매출 추적', '고객 분석', '매출 예측'],
    },
    {
      title: '재고 관리',
      description: '재고 수준 모니터링, 이동 추적 및 창고 운영 관리',
      icon: Package,
      link: '/inventory/dashboard',
      color: 'bg-green-500',
      stats: ['재고 모니터링', '유효기간 추적', '재고 평가 분석'],
    },
    {
      title: '생산 관리',
      description: '생산 주문 관리, 자재 사용 추적 및 설비 모니터링',
      icon: Factory,
      link: '/production/output',
      color: 'bg-purple-500',
      stats: ['생산량 현황', '불량 추적', '설비 가동률'],
    },
    {
      title: '재무 분석',
      description: '손익 분석, 비용 추적 및 재무 성과 모니터링',
      icon: DollarSign,
      link: '/finance/dashboard',
      color: 'bg-amber-500',
      stats: ['손익 분석', '비용 내역', '현금흐름 추적'],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">제조업 ERP 대시보드</h1>
        <p className="mt-2 text-lg text-gray-600">
          제조업 운영을 위한 종합 ERP 솔루션
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.title}
              to={module.link}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`${module.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{module.title}</h2>
                <p className="text-gray-600 mb-4">{module.description}</p>
                <div className="space-y-1">
                  {module.stats.map((stat, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-gray-300 rounded-full mr-2" />
                      {stat}
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          AI 연동 가능한 데이터 아키텍처
        </h3>
        <p className="text-gray-600">
          이 ERP 시스템은 일관된 필드 명명 규칙을 가진 깔끔한 REST 엔드포인트를 제공하여,
          예측 분석, 자동화된 인사이트, 지능형 의사결정 지원을 위한 AI 기능을 쉽게 통합할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

export default Home;