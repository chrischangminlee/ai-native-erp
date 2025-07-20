import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import ByItem from './ByItem';
import LotExpiry from './LotExpiry';
import History from './History';
import Valuation from './Valuation';
import Risk from './Risk';

function InventoryOverview() {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="by-item" element={<ByItem />} />
      <Route path="lot-expiry" element={<LotExpiry />} />
      <Route path="history" element={<History />} />
      <Route path="valuation" element={<Valuation />} />
      <Route path="risk" element={<Risk />} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default InventoryOverview;