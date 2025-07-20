import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';

function FinanceOverview() {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="by-dept" element={<Dashboard />} />
      <Route path="by-product" element={<Dashboard />} />
      <Route path="cost-structure" element={<Dashboard />} />
      <Route path="variance" element={<Dashboard />} />
      <Route path="cashflow" element={<Dashboard />} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default FinanceOverview;