# Manufacturing ERP Demo

A lightweight, manufacturing-oriented ERP demonstration system with REST API endpoints designed for AI integration.

## Overview

This ERP system provides comprehensive manufacturing operations management including:
- **Sales Management**: Revenue tracking, customer analytics, and forecasting
- **Inventory Control**: Stock monitoring, warehouse management, and valuation
- **Production Planning**: Output tracking, material usage, and equipment utilization
- **Financial Analysis**: P&L reporting, cost analysis, and cash flow management

## Tech Stack

- **Backend**: Node.js, Express.js, SQLite
- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **API Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd manufacturing-erp-demo
```

2. Install dependencies:
```bash
npm install
```

This will install dependencies for both backend and frontend workspaces.

## Running the Application

### Development Mode

Start both backend and frontend in development mode:
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:3001
- Frontend development server on http://localhost:5173
- API documentation at http://localhost:3001/api-docs

### Running Services Individually

Backend only:
```bash
npm run dev:backend
```

Frontend only:
```bash
npm run dev:frontend
```

## API Endpoints

### Sales Endpoints
- `GET /api/sales/dashboard` - Sales dashboard metrics
- `GET /api/sales/by-product` - Sales by product analysis
- `GET /api/sales/by-customer` - Customer sales breakdown
- `GET /api/sales/by-region` - Regional sales analysis
- `GET /api/sales/forecast` - Sales forecasting
- `GET /api/sales/receivables` - Accounts receivable status

### Inventory Endpoints
- `GET /api/inventory/dashboard` - Inventory overview metrics
- `GET /api/inventory/by-item` - Item-level inventory details
- `GET /api/inventory/expiry` - Lot expiry tracking
- `GET /api/inventory/history` - Movement history
- `GET /api/inventory/valuation` - Inventory valuation
- `GET /api/inventory/risk` - Risk analysis

### Production Endpoints
- `GET /api/production/output` - Production output metrics
- `GET /api/production/by-process` - Process efficiency analysis
- `GET /api/production/usage` - Material usage tracking
- `GET /api/production/defects` - Defect analysis
- `GET /api/production/equipment` - Equipment utilization
- `GET /api/production/wip` - Work in progress status

### Finance Endpoints
- `GET /api/finance/dashboard` - P&L overview
- `GET /api/finance/by-dept` - Department-wise P&L
- `GET /api/finance/by-product` - Product profitability
- `GET /api/finance/cost-structure` - Fixed vs variable costs
- `GET /api/finance/variance` - Cost variance analysis
- `GET /api/finance/cashflow` - Cash flow and ratios

### Common Query Parameters
- `period`: Time period filter (e.g., 'current-month', 'last-3-months', 'last-12-months')
- `warehouse_id`: Filter by warehouse (for inventory endpoints)
- `days_ahead`: Number of days to look ahead (for expiry tracking)

## Sample API Responses

### Sales Dashboard
```json
{
  "kpis": {
    "revenue": {
      "value": 2500000,
      "yoy": "15.3",
      "label": "Revenue"
    },
    "units_sold": {
      "value": 15420,
      "yoy": "8.7",
      "label": "Units Sold"
    }
  },
  "trend": [
    {
      "month": "2024-01",
      "revenue": 2100000,
      "orders": 342
    }
  ],
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

### Inventory Risk Monitor
```json
{
  "slowMovingItems": [...],
  "overstockItems": [...],
  "riskSummary": {
    "slow_moving_value": 125000,
    "overstock_value": 87500,
    "near_expiry_value": 45000,
    "total_at_risk": 257500
  }
}
```

## Database Schema

The system uses SQLite with the following main tables:
- `products` - Product catalog
- `customers` - Customer information
- `sales_orders` - Sales transactions
- `inventory_stock` - Current inventory levels
- `production_orders` - Manufacturing orders
- `financial_transactions` - Financial records
- `equipment` - Production equipment

## AI Integration

The API is designed with AI integration in mind:
- Consistent field naming conventions (e.g., `sales.amount.monthly`)
- Clean REST endpoints returning structured JSON
- OpenAPI specification for easy integration
- Aggregated metrics suitable for ML models

## Development Notes

### Adding New Features
1. Backend: Add controller methods in `/backend/src/controllers/`
2. Frontend: Create components in `/frontend/src/components/`
3. Update routes in respective module files

### Database Seeding
The database is automatically seeded with sample data on first run. To reset:
1. Delete `/backend/src/db/erp.db`
2. Restart the backend server

## Deployment

### Production Build
```bash
npm run build
```

This creates optimized builds:
- Backend: Ready for deployment
- Frontend: Static files in `/frontend/dist`

### Environment Variables
Create `.env` files for configuration:
- Backend: `PORT`, `NODE_ENV`
- Frontend: `VITE_API_URL`

## License

MIT License - see LICENSE file for details