# API Implementation Checklist

Here is the list of all backend endpoints available. Check them off as they are implemented/integrated into the frontend.

## Auth (`/auth`)
- [x] `POST /auth/register` - Register a new user
- [x] `POST /auth/login` - Login and receive a JWT token
- [x] `GET /auth/me` - Get current authenticated user's details

## Dashboard (`/dashboard`)
- [x] `GET /dashboard/` - Get overview statistics and data for the dashboard

## Products (`/products`)
- [x] `GET /products/` - Get all products (with optional category & search filters)
- [x] `POST /products/` - Create a new product
- [x] `GET /products/{product_id}` - Get details of a specific product
- [x] `PUT /products/{product_id}` - Update a product
- [x] `DELETE /products/{product_id}` - Delete a product

## Stock / Inventory (`/stock`)
- [x] `GET /stock/` - Get current stock levels for all products
- [x] `POST /stock/transaction` - Create a stock transaction (IN/OUT)
- [x] `GET /stock/{product_id}` - Get stock level for a specific product
- [x] `GET /stock/{product_id}/history` - Get stock transaction history for a specific product

## Categories (`/categories`)
- [x] `GET /categories/` - Get all categories
- [x] `POST /categories/` - Create a new category
- [x] `GET /categories/{category_id}` - Get details of a specific category
- [x] `PUT /categories/{category_id}` - Update a category
- [x] `DELETE /categories/{category_id}` - Delete a category

## Alerts (`/alerts`)
- [x] `GET /alerts/` - Get all alerts (low stock, overstock, etc.)
- [x] `GET /alerts/{alert_id}` - Get details of a specific alert
- [x] `PUT /alerts/{alert_id}/resolve` - Mark a specific alert as resolved
