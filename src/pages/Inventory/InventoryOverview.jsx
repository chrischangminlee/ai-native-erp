import { Routes, Route, Navigate } from 'react-router-dom';

function InventoryDashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Inventory Dashboard</h2>
      <p className="text-gray-600">Inventory dashboard implementation coming soon...</p>
    </div>
  );
}

function InventoryOverview() {
  return (
    <Routes>
      <Route path="dashboard" element={<InventoryDashboard />} />
      <Route path="by-item" element={<InventoryDashboard />} />
      <Route path="lot-expiry" element={<InventoryDashboard />} />
      <Route path="history" element={<InventoryDashboard />} />
      <Route path="valuation" element={<InventoryDashboard />} />
      <Route path="risk" element={<InventoryDashboard />} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default InventoryOverview;