import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import ByProduct from './ByProduct';
import ByCustomer from './ByCustomer';
import ByRegion from './ByRegion';
import Receivables from './Receivables';

function SalesOverview() {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="by-product" element={<ByProduct />} />
      <Route path="by-customer" element={<ByCustomer />} />
      <Route path="by-region" element={<ByRegion />} />
      <Route path="receivables" element={<Receivables />} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default SalesOverview;