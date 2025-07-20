import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';

function InventoryOverview() {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="by-item" element={<Dashboard />} />
      <Route path="lot-expiry" element={<Dashboard />} />
      <Route path="history" element={<Dashboard />} />
      <Route path="valuation" element={<Dashboard />} />
      <Route path="risk" element={<Dashboard />} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default InventoryOverview;