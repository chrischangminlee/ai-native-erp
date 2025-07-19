import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SalesOverview from './pages/Sales/SalesOverview';
import InventoryOverview from './pages/Inventory/InventoryOverview';
import ProductionOverview from './pages/Production/ProductionOverview';
import FinanceOverview from './pages/Finance/FinanceOverview';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="sales/*" element={<SalesOverview />} />
          <Route path="inventory/*" element={<InventoryOverview />} />
          <Route path="production/*" element={<ProductionOverview />} />
          <Route path="finance/*" element={<FinanceOverview />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;