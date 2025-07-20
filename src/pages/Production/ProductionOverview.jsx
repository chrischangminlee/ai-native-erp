import { Routes, Route, Navigate } from 'react-router-dom';
import Output from './Output';
import ByProcess from './ByProcess';
import Usage from './Usage';
import Defects from './Defects';
import Equipment from './Equipment';
import WIP from './WIP';

function ProductionOverview() {
  return (
    <Routes>
      <Route path="output" element={<Output />} />
      <Route path="by-process" element={<ByProcess />} />
      <Route path="usage" element={<Usage />} />
      <Route path="defects" element={<Defects />} />
      <Route path="equipment" element={<Equipment />} />
      <Route path="wip" element={<WIP />} />
      <Route path="/" element={<Navigate to="output" replace />} />
    </Routes>
  );
}

export default ProductionOverview;