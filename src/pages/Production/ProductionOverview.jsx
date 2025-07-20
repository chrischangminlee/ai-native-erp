import { Routes, Route, Navigate } from 'react-router-dom';
import Output from './Output';

function ProductionOverview() {
  return (
    <Routes>
      <Route path="output" element={<Output />} />
      <Route path="by-process" element={<Output />} />
      <Route path="usage" element={<Output />} />
      <Route path="defects" element={<Output />} />
      <Route path="equipment" element={<Output />} />
      <Route path="wip" element={<Output />} />
      <Route path="/" element={<Navigate to="output" replace />} />
    </Routes>
  );
}

export default ProductionOverview;