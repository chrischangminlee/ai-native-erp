# Manufacturing ERP Demo - AI Assistant Guide

## Project Overview

This is a lightweight Manufacturing ERP (Enterprise Resource Planning) demonstration system designed specifically for AI integration. The system provides comprehensive manufacturing operations management through four main modules: Sales, Inventory, Production, and Finance. It's built as a monorepo with separate backend and frontend workspaces, featuring REST APIs with consistent field naming conventions optimized for AI/LLM consumption.

### Purpose
- Demonstrate a modern ERP architecture suitable for manufacturing businesses
- Provide clean, AI-friendly APIs for seamless integration with language models
- Showcase best practices in full-stack JavaScript development
- Serve as a foundation for building AI-enhanced ERP features

## Architecture Decisions & Tech Stack

### Backend
- **Runtime**: Node.js (v16+) with ES modules
- **Framework**: Express.js 4.x for REST API
- **Database**: SQLite3 for simplicity and portability
- **API Documentation**: Swagger/OpenAPI auto-generated from JSDoc comments
- **Key Libraries**:
  - `cors` for cross-origin resource sharing
  - `date-fns` for date manipulation
  - `swagger-jsdoc` & `swagger-ui-express` for API documentation

### Frontend
- **Framework**: React 18.x with Vite as build tool
- **Routing**: React Router v6 for client-side navigation
- **Styling**: Tailwind CSS for utility-first styling
- **Charts**: Recharts for data visualization
- **HTTP Client**: Axios with interceptors for API communication
- **Icons**: Lucide React for consistent iconography
- **State Management**: React hooks (useState, useEffect) - no external state library

### Architecture Principles
- **Separation of Concerns**: Clear separation between API and UI layers
- **RESTful Design**: Consistent REST endpoints with predictable patterns
- **Monorepo Structure**: Shared development environment with npm workspaces
- **Database-First**: Schema drives the application design
- **AI-Ready**: Consistent field naming and structured responses

## Project Structure

```
manufacturing-erp-demo/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── controllers/       # Business logic handlers
│   │   │   ├── financeController.js
│   │   │   ├── inventoryController.js
│   │   │   ├── productionController.js
│   │   │   └── salesController.js
│   │   ├── db/               # Database layer
│   │   │   ├── database.js   # SQLite connection manager
│   │   │   ├── schema.sql    # Database schema definition
│   │   │   └── seed.js       # Sample data generator
│   │   ├── routes/           # API endpoint definitions
│   │   │   ├── finance.js
│   │   │   ├── inventory.js
│   │   │   ├── production.js
│   │   │   └── sales.js
│   │   ├── utils/            # Helper functions
│   │   │   └── helpers.js    # Date ranges, calculations, etc.
│   │   └── index.js          # Server entry point
│   └── package.json
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── DataTable.jsx
│   │   │   ├── ErrorMessage.jsx
│   │   │   ├── KPICard.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── PeriodSelector.jsx
│   │   │   └── TrendChart.jsx
│   │   ├── pages/           # Route-based page components
│   │   │   ├── Finance/
│   │   │   ├── Inventory/
│   │   │   ├── Production/
│   │   │   ├── Sales/
│   │   │   └── Home.jsx
│   │   ├── services/        # API integration layer
│   │   │   └── api.js       # Axios configuration & API methods
│   │   ├── App.jsx          # Root component with routing
│   │   └── main.jsx         # Application entry point
│   └── package.json
└── package.json             # Root package with workspace configuration
```

## Important Conventions & Patterns

### API Response Structure
All API endpoints return consistent JSON structures:
```json
{
  "kpis": {
    "metric_name": {
      "value": number,
      "yoy": string,      // Year-over-year percentage
      "label": string     // Human-readable label
    }
  },
  "trend": [...],         // Time-series data
  "items": [...],         // Detailed records
  "period": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  }
}
```

### Naming Conventions
- **Database**: Snake_case for tables and columns (e.g., `sales_orders`, `unit_price`)
- **API Routes**: Kebab-case URLs (e.g., `/api/sales/by-product`)
- **JavaScript**: camelCase for variables and functions
- **React Components**: PascalCase for component names
- **CSS Classes**: Tailwind utility classes

### Error Handling
- Backend: Try-catch blocks in controllers with 500 status on errors
- Frontend: Error boundaries and fallback UI components
- API: Axios interceptors for global error handling

### Date Handling
- All dates stored as ISO strings in SQLite
- `date-fns` library for date manipulation
- Consistent period parameters: 'current-month', 'last-3-months', etc.

## Database Schema Overview

### Core Tables
1. **products**: Product catalog with SKU, pricing, and categories
2. **customers**: Customer master data with regions and credit limits
3. **sales_orders**: Sales transactions with status tracking
4. **sales_order_items**: Line items with margins
5. **warehouses**: Storage locations
6. **inventory_stock**: Current stock levels by warehouse and lot
7. **inventory_transactions**: Stock movement history
8. **production_orders**: Manufacturing work orders
9. **production_processes**: Manufacturing process definitions
10. **bom**: Bill of Materials relationships
11. **material_consumption**: Actual vs planned material usage
12. **production_defects**: Quality tracking
13. **equipment**: Asset registry
14. **equipment_utilization**: OEE tracking
15. **departments**: Cost centers
16. **financial_transactions**: General ledger entries
17. **monthly_snapshots**: Pre-aggregated metrics for performance

### Key Relationships
- Products → Sales Orders → Customers
- Products → Inventory → Warehouses
- Production Orders → BOM → Material Consumption
- Financial Transactions → Departments

## API Design Principles

### RESTful Endpoints
Each module follows consistent patterns:
- `GET /api/{module}/dashboard` - Overview metrics
- `GET /api/{module}/by-{dimension}` - Dimensional analysis
- `GET /api/{module}/{specific-feature}` - Specialized views

### Query Parameters
- `period`: Time range filter (standardized values)
- `warehouse_id`: Location filter for inventory
- `days_ahead`: Forward-looking windows
- `method`: Calculation methods (e.g., FIFO, LIFO)

### Performance Optimizations
- Database indexes on date and foreign key columns
- Monthly snapshots table for pre-aggregated metrics
- Efficient SQL queries with proper JOINs
- Pagination support (though not fully implemented)

## Frontend Component Architecture

### Component Hierarchy
```
App.jsx
└── Layout.jsx (navigation wrapper)
    └── Module Overview Pages (e.g., SalesOverview)
        ├── PeriodSelector (time range control)
        ├── KPICard (metric displays)
        ├── TrendChart (time series)
        └── DataTable (detailed records)
```

### State Management
- Local component state for UI controls
- Data fetching with useEffect hooks
- Loading and error states in each page component
- No global state management (keeping it simple)

### Routing Structure
- `/` - Home dashboard
- `/sales/*` - Sales module with sub-routes
- `/inventory/*` - Inventory module
- `/production/*` - Production module
- `/finance/*` - Finance module

## Testing Approach

Currently, the project does not include automated tests. For production use, consider adding:
- **Backend**: Jest for unit tests, Supertest for API integration tests
- **Frontend**: Vitest for component tests, React Testing Library
- **E2E**: Playwright or Cypress for end-to-end testing

## Development Workflow

### Initial Setup
```bash
# Clone and navigate to project
git clone <repository-url>
cd manufacturing-erp-demo

# Install all dependencies
npm install
```

### Development Commands
```bash
# Start both backend and frontend
npm run dev

# Backend only (port 3001)
npm run dev:backend

# Frontend only (port 5173)
npm run dev:frontend

# Build for production
npm run build
```

### Database Management
- Database auto-initializes on first run
- Sample data auto-seeds if tables are empty
- To reset: Delete `backend/src/db/erp.db` and restart

### API Documentation
- Swagger UI available at http://localhost:3001/api-docs
- Auto-generated from JSDoc comments in route files

## Future Enhancements & AI Integration Points

### Immediate AI Opportunities
1. **Natural Language Queries**: Add an NLP endpoint to convert questions to SQL
2. **Anomaly Detection**: Flag unusual patterns in sales, inventory, or production
3. **Predictive Analytics**: Enhance forecasting with ML models
4. **Automated Insights**: Generate executive summaries from data

### Suggested Enhancements
1. **Authentication**: Add JWT-based auth system
2. **Real-time Updates**: WebSocket support for live dashboards
3. **Data Export**: CSV/Excel export functionality
4. **Advanced Filtering**: Multi-dimensional filtering UI
5. **Mobile Responsive**: Optimize for mobile devices
6. **Batch Operations**: Bulk update APIs
7. **Audit Trail**: Change tracking for compliance

### AI-Specific Features
1. **Conversational Interface**: Chat-based ERP queries
2. **Smart Alerts**: ML-driven threshold detection
3. **Document Processing**: OCR for invoice/PO intake
4. **Demand Forecasting**: Advanced time-series predictions
5. **Process Optimization**: AI-suggested workflow improvements

## Known Issues & Limitations

### Current Limitations
1. **Database**: SQLite limits concurrent writes
2. **Authentication**: No user authentication implemented
3. **Validation**: Limited input validation on API endpoints
4. **Error Messages**: Generic error responses need improvement
5. **Pagination**: Not implemented for large datasets
6. **Time Zones**: All times assumed to be in local timezone
7. **Currency**: Single currency support only

### Technical Debt
1. **Test Coverage**: No automated tests
2. **TypeScript**: Consider migration for better type safety
3. **API Versioning**: No version strategy implemented
4. **Logging**: Minimal logging infrastructure
5. **Configuration**: Hard-coded values need environment variables

## Performance Considerations

### Database Performance
- Indexes on frequently queried columns
- Monthly snapshots reduce aggregation load
- Consider PostgreSQL for production use
- Implement connection pooling for scale

### Frontend Performance
- Lazy loading for route-based code splitting
- Memoization for expensive calculations
- Virtual scrolling for large tables
- Image optimization needed

### API Performance
- Add caching layer (Redis) for frequently accessed data
- Implement request rate limiting
- Consider GraphQL for reducing over-fetching
- Add compression middleware

### Monitoring Recommendations
1. **APM**: Application Performance Monitoring
2. **Error Tracking**: Sentry or similar
3. **Analytics**: User behavior tracking
4. **Uptime**: Endpoint availability monitoring
5. **Database**: Query performance analysis

## Best Practices for AI Assistants

When working with this codebase:
1. **Maintain Consistency**: Follow established patterns for new features
2. **Document Changes**: Update JSDoc comments for API changes
3. **Test Manually**: Verify changes in both backend and frontend
4. **Consider Performance**: Check query efficiency for new endpoints
5. **Preserve AI-Friendliness**: Keep field names descriptive and consistent

This system is designed to be extended and enhanced. The clean architecture and consistent patterns make it ideal for AI-assisted development and integration with language models.