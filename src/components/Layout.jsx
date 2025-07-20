import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Factory, 
  DollarSign,
  ChevronRight,
  Home
} from 'lucide-react';
import { useState, useEffect } from 'react';

const mainNavItems = [
  { path: '/', label: 'AI-ERP 홈', icon: Home },
  { path: '/sales', label: '매출 현황', icon: ShoppingCart },
  { path: '/inventory', label: '창고별 재고', icon: Package },
  { path: '/production', label: '생산 입출고/소비', icon: Factory },
  { path: '/finance', label: '월별 손익 분석', icon: DollarSign },
];

const subNavConfig = {
  '/sales': [
    { path: 'dashboard', label: '대시보드' },
    { path: 'by-product', label: '제품별' },
    { path: 'by-customer', label: '고객별' },
    { path: 'by-region', label: '지역별' },
    { path: 'receivables', label: '매출채권' },
  ],
  '/inventory': [
    { path: 'dashboard', label: '대시보드' },
    { path: 'by-item', label: '품목별' },
    { path: 'lot-expiry', label: '로트 및 유효기간' },
    { path: 'history', label: '입출고 이력' },
    { path: 'valuation', label: '재고 평가' },
    { path: 'risk', label: '위험 모니터' },
  ],
  '/production': [
    { path: 'output', label: '월별 생산량' },
    { path: 'by-process', label: '공정별' },
    { path: 'usage', label: '자재 사용' },
    { path: 'defects', label: '불량 및 스크랩' },
    { path: 'equipment', label: '설비 가동률' },
    { path: 'wip', label: '재공품 현황' },
  ],
  '/finance': [
    { path: 'dashboard', label: '대시보드' },
    { path: 'by-dept', label: '부서별' },
    { path: 'by-product', label: '제품별' },
    { path: 'cost-structure', label: '고정비 vs 변동비' },
    { path: 'variance', label: '원가 차이' },
    { path: 'cashflow', label: '현금흐름 및 비율' },
  ],
};

function Layout() {
  const location = useLocation();
  const [activeMainNav, setActiveMainNav] = useState('/');

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const mainPath = `/${pathSegments[1]}`;
    setActiveMainNav(mainPath === '/' ? '/' : mainPath);
  }, [location]);

  const getSubNavItems = () => {
    return subNavConfig[activeMainNav] || [];
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Global Navigation Bar */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">제조업 ERP</h1>
            </div>
            <nav className="hidden md:flex space-x-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive || (item.path !== '/' && location.pathname.startsWith(item.path))
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar */}
        {activeMainNav !== '/' && (
          <aside className="w-64 bg-white shadow-lg">
            <div className="h-full px-3 py-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  {mainNavItems.find(item => item.path === activeMainNav)?.label}
                </h2>
              </div>
              <nav className="space-y-1">
                {getSubNavItems().map((item) => (
                  <NavLink
                    key={item.path}
                    to={`${activeMainNav}/${item.path}`}
                    className={({ isActive }) =>
                      `block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;