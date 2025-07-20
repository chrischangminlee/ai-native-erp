import { Routes, Route, Navigate } from 'react-router-dom';

function FinanceDashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Finance Dashboard</h2>
      <p className="text-gray-600">Finance dashboard implementation coming soon...</p>
    </div>
  );
}

function FinanceOverview() {
  return (
    <Routes>
      <Route path="dashboard" element={<FinanceDashboard />} />
      <Route path="by-dept" element={<FinanceDashboard />} />
      <Route path="by-product" element={<FinanceDashboard />} />
      <Route path="cost-structure" element={<FinanceDashboard />} />
      <Route path="variance" element={<FinanceDashboard />} />
      <Route path="cashflow" element={<FinanceDashboard />} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default FinanceOverview;