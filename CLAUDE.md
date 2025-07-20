# AI-Native Manufacturing ERP System - Claude Code Guide

> 🎯 **Purpose**: This guide helps Claude Code understand the project structure and assists non-developers in making effective changes to the ERP system.

## 🌟 Quick Overview for Non-Developers

This is a web-based ERP (Enterprise Resource Planning) system designed for manufacturing companies. It helps track:
- **Sales** (매출): Customer orders, revenue, forecasts
- **Inventory** (재고): Stock levels, warehouse management, expiry tracking
- **Production** (생산): Manufacturing orders, material usage, quality control
- **Finance** (재무): Profit & loss, cost analysis, cash flow

The system is built to be "AI-ready" with clean data structures that AI assistants can easily understand and modify.

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   API Routes    │────▶│   Database      │
│   (React)       │     │   (Vercel)      │     │   (SQLite)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Browser              Serverless              File-based DB
```

### Deployment Structure
- **Platform**: Vercel (serverless hosting)
- **Frontend**: React single-page application
- **Backend**: 4 consolidated API endpoints (sales, inventory, production, finance)
- **Database**: SQLite (automatically initialized with sample data)

## 📁 Project Structure Explained

```
ai-native-erp/
├── 📂 api/                    # Backend API endpoints (Vercel serverless functions)
│   ├── sales.js              # All sales-related endpoints
│   ├── inventory.js          # All inventory-related endpoints
│   ├── production.js         # All production-related endpoints
│   └── finance.js            # All finance-related endpoints
│
├── 📂 lib/                    # Shared backend utilities
│   ├── db.js                 # Database connection handler
│   ├── helpers.js            # Utility functions (date ranges, calculations)
│   ├── init-db.js            # Auto-initializes database on first run
│   ├── schema.sql            # Database structure definition
│   └── seed.js               # Sample data generator
│
├── 📂 src/                    # Frontend React application
│   ├── 📂 components/        # Reusable UI components
│   │   ├── DataTable.jsx     # Tables with sorting
│   │   ├── KPICard.jsx       # Metric display cards
│   │   ├── TrendChart.jsx    # Line/bar charts
│   │   └── Layout.jsx        # Main navigation structure
│   │
│   ├── 📂 pages/             # Main application screens
│   │   ├── Sales/            # 6 sales sub-pages
│   │   ├── Inventory/        # 6 inventory sub-pages
│   │   ├── Production/       # 6 production sub-pages
│   │   ├── Finance/          # 6 finance sub-pages
│   │   └── Home.jsx          # Landing page
│   │
│   ├── 📂 services/          # API communication
│   │   └── api.js            # Centralized API calls
│   │
│   └── App.jsx               # Main app routing
│
├── 📂 public/                # Static assets
├── package.json              # Project dependencies
├── vercel.json              # Vercel deployment config
└── vite.config.js           # Frontend build config
```

## 🔄 Common Workflows for Non-Developers

### 1. Changing Text/Labels (한글 번역)
**Where**: Component files in `src/components/` and `src/pages/`
**Example**: To change "Revenue" to "매출액":
```javascript
// Before
<h3>Revenue</h3>

// After  
<h3>매출액</h3>
```

### 2. Modifying KPI Cards
**Where**: Page files like `src/pages/Sales/Dashboard.jsx`
**What to look for**: `<KPICard>` components
```javascript
<KPICard
  title="총 매출"           // Change title here
  value={revenue}          // Don't change this
  suffix="원"              // Add currency suffix
  trend={revenueGrowth}    // Don't change this
  icon={ShoppingCart}      // Don't change this
/>
```

### 3. Changing Chart Colors
**Where**: `TrendChart.jsx` component
**Look for**: Color definitions like `#3B82F6` (blue), `#10B981` (green)

### 4. Adding New Metrics
**Process**:
1. Add calculation in API endpoint (e.g., `api/sales.js`)
2. Add display in frontend page
3. Claude Code can help with both steps

### 5. Modifying Navigation
**Where**: `src/components/Layout.jsx`
**What**: `mainNavItems` and `subNavConfig` objects

## 🔌 API Structure

Each module has one API file handling multiple actions:

### Sales API (`/api/sales`)
- `?action=dashboard` - Overview metrics
- `?action=by-product` - Product performance
- `?action=by-customer` - Customer analysis
- `?action=by-region` - Regional breakdown
- `?action=forecast` - Sales predictions
- `?action=receivables` - Outstanding payments

### Inventory API (`/api/inventory`)
- `?action=dashboard` - Stock overview
- `?action=by-item` - Item details
- `?action=expiry` - Expiration tracking
- `?action=history` - Movement logs
- `?action=valuation` - Stock value
- `?action=risk` - Risk analysis

### Production API (`/api/production`)
- `?action=output` - Production volume
- `?action=by-process` - Process efficiency
- `?action=usage` - Material consumption
- `?action=defects` - Quality metrics
- `?action=equipment` - Machine utilization
- `?action=wip` - Work in progress

### Finance API (`/api/finance`)
- `?action=dashboard` - P&L overview
- `?action=by-dept` - Department costs
- `?action=by-product` - Product profitability
- `?action=cost-structure` - Fixed vs variable
- `?action=variance` - Budget variance
- `?action=cashflow` - Cash analysis

## 💾 Database Schema

### Key Tables and Relationships
```
products (제품)
  ├── sales_order_items (판매 항목)
  ├── inventory_stock (재고)
  ├── production_orders (생산 주문)
  └── bom (자재명세서)

customers (고객)
  └── sales_orders (판매 주문)
      └── sales_order_items

warehouses (창고)
  └── inventory_stock
      └── inventory_transactions (재고 거래)

departments (부서)
  └── financial_transactions (재무 거래)
```

### Important Fields
- All dates: ISO format (YYYY-MM-DD)
- All amounts: Numeric (no formatting)
- Status fields: English lowercase (pending, completed, cancelled)

## 🎨 UI/UX Patterns

### Component Usage
1. **KPICard**: For single metrics with trends
   - Shows current value
   - Year-over-year comparison
   - Colored trend arrows

2. **TrendChart**: For time-series data
   - Supports line and bar charts
   - Automatic formatting
   - Responsive design

3. **DataTable**: For detailed records
   - Sortable columns
   - Formatted numbers
   - Row highlighting

### Color Scheme
- Primary: Blue (`#3B82F6`)
- Success: Green (`#10B981`)
- Warning: Yellow (`#F59E0B`)
- Danger: Red (`#EF4444`)
- Background: Gray (`#F9FAFB`)

### Korean UI Conventions
- Currency: "원" suffix
- Percentages: "%" suffix
- Dates: YYYY년 MM월 DD일
- Numbers: Comma separators

## 🚀 Deployment Process

### Vercel Deployment
1. **Automatic**: Push to GitHub triggers deployment
2. **Manual**: `vercel` command in terminal
3. **Environment**: No env variables needed (uses SQLite)

### Function Limits
- Vercel Hobby: Max 12 serverless functions
- Current usage: 4 functions (consolidated by module)
- Each function handles 6 sub-actions

## 🔧 Common Modifications

### Adding a New KPI
1. **Backend**: Add calculation in relevant API function
```javascript
// In api/sales.js getDashboard function
const newMetric = await db.getAsync(`
  SELECT COUNT(*) as value 
  FROM sales_orders 
  WHERE status = 'urgent'
`);
```

2. **Frontend**: Display in page component
```javascript
<KPICard
  title="긴급 주문"
  value={data.kpis.urgent_orders.value}
  icon={AlertCircle}
/>
```

### Changing Date Ranges
**Location**: `lib/helpers.js` - `getDateRange` function
**Current options**: 
- current-month (이번 달)
- last-month (지난 달)
- last-3-months (최근 3개월)
- last-6-months (최근 6개월)
- last-12-months (최근 12개월)

### Modifying Charts
**Location**: Component using `<TrendChart>`
**Properties**:
- `data`: Array of objects with date/value
- `dataKey`: Which field to plot
- `color`: Hex color code
- `type`: "line" or "bar"

## 🐛 Troubleshooting Guide

### "No Data" Issues
1. **Check API calls**: Browser DevTools > Network tab
2. **Database initialization**: Should auto-create on first run
3. **Date ranges**: Ensure sample data covers selected period

### Styling Issues
1. **Tailwind classes**: Use Tailwind CSS utilities
2. **Responsive**: Test on different screen sizes
3. **Korean text**: Ensure proper font support

### Performance Issues
1. **Large datasets**: Implement pagination
2. **Complex queries**: Add database indexes
3. **Frontend**: Use React.memo for heavy components

## 📚 Best Practices for Claude Code

### When Asking for Changes
1. **Be specific**: "Change the revenue card title to 매출액"
2. **Provide context**: "In the sales dashboard..."
3. **Mention the module**: "In the inventory section..."

### File References
- Always mention the module (sales/inventory/production/finance)
- Specify if it's frontend or backend
- Use Korean terms if referring to UI elements

### Common Patterns
1. **Adding features**: Usually requires both API and frontend changes
2. **Changing calculations**: Modify SQL queries in API files
3. **UI updates**: Change component files in src/pages/
4. **New reports**: Add new action in API, new component in frontend

## 🌐 Language Considerations

### Current Status
- **Backend**: English (database, API)
- **Frontend**: Partially Korean
- **Comments**: English

### Translation Guidelines
- Keep technical terms in English in code
- Translate UI text to Korean
- Use consistent terminology across modules

### Common Translations
- Dashboard → 대시보드
- Revenue → 매출
- Inventory → 재고
- Production → 생산
- Finance → 재무
- Customer → 고객
- Product → 제품
- Order → 주문
- Report → 보고서

## 🔒 Security Considerations

### Current Implementation
- No authentication (demo system)
- Read-only API endpoints
- SQLite database (file-based)
- No sensitive data storage

### For Production
Would need:
- User authentication
- Role-based access control
- Encrypted connections
- Audit logging
- Data backup

## 📈 Extending the System

### Adding New Modules
1. Create new API endpoint in `/api/`
2. Add navigation in `Layout.jsx`
3. Create page components in `/src/pages/`
4. Update `subNavConfig` for sub-navigation

### Integrating External Services
- APIs: Add to `services/api.js`
- Webhooks: Create new API endpoints
- Real-time: Consider WebSocket integration

### Mobile Support
Currently responsive but for native app:
- API is ready (RESTful)
- Would need mobile-specific UI
- Consider React Native

## 💡 Tips for Non-Developers

### Understanding the Flow
1. User clicks in browser
2. React component makes API call
3. API queries database
4. Data returns to browser
5. React updates display

### Making Safe Changes
- **Safe**: Text, colors, labels
- **Moderate**: Adding new displays of existing data
- **Complex**: New calculations, database changes

### Getting Help from Claude Code
- Describe what you see
- Explain what you want to change
- Mention any error messages
- Share screenshots if needed

### Version Control
- All changes are tracked in Git
- Can always revert if needed
- Test locally before deploying

## 🚦 Quick Command Reference

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start local development
npm run build        # Build for production
```

### Deployment
```bash
git add .            # Stage changes
git commit -m "..."  # Commit changes
git push            # Deploy to Vercel
```

### Database
```bash
# Database auto-initializes, but to reset:
rm erp.db           # Delete database
npm run dev         # Restart (auto-creates)
```

---

## 📝 Frequently Requested Changes

### 1. "Add a new metric to dashboard"
- Claude Code needs: Which module, what calculation, where to display

### 2. "Change colors/theme"
- Claude Code needs: Which components, what colors

### 3. "Add export to Excel"
- Claude Code needs: Which data, what format

### 4. "Translate to Korean"
- Claude Code needs: Which sections, maintain functionality

### 5. "Add new report"
- Claude Code needs: Data source, layout preference

## 🎯 Success Tips

1. **Start small**: Make one change at a time
2. **Test locally**: Run `npm run dev` before deploying
3. **Be patient**: Some changes require multiple files
4. **Ask questions**: Claude Code can explain any part
5. **Keep backups**: Commit working versions to Git

Remember: This system is designed to be modified. Don't worry about breaking things - that's how we learn and improve!