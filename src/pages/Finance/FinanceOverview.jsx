import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import ByDepartment from './ByDepartment';
import ByProduct from './ByProduct';
import CostStructure from './CostStructure';
import Variance from './Variance';
import Cashflow from './Cashflow';

function FinanceOverview() {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="by-dept" element={<ByDepartment />} />
      <Route path="by-product" element={<ByProduct />} />
      <Route path="cost-structure" element={<CostStructure />} />
      <Route path="variance" element={<Variance />} />
      <Route path="cashflow" element={<Cashflow />} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default FinanceOverview;