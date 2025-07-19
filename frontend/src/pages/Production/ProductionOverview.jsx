import { Routes, Route, Navigate } from 'react-router-dom';

function ProductionDashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Production Dashboard</h2>
      <p className="text-gray-600">Production dashboard implementation coming soon...</p>
    </div>
  );
}

function ProductionOverview() {
  return (
    <Routes>
      <Route path="output" element={<ProductionDashboard />} />
      <Route path="by-process" element={<ProductionDashboard />} />
      <Route path="usage" element={<ProductionDashboard />} />
      <Route path="defects" element={<ProductionDashboard />} />
      <Route path="equipment" element={<ProductionDashboard />} />
      <Route path="wip" element={<ProductionDashboard />} />
      <Route path="/" element={<Navigate to="output" replace />} />
    </Routes>
  );
}

export default ProductionOverview;