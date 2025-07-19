import express from 'express';
import * as salesController from '../controllers/salesController.js';

const router = express.Router();

/**
 * @swagger
 * /api/sales/dashboard:
 *   get:
 *     summary: Get sales dashboard metrics
 *     tags: [Sales]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [current-month, last-month, last-3-months, last-6-months, last-12-months]
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Sales dashboard metrics
 */
router.get('/dashboard', salesController.getDashboard);

/**
 * @swagger
 * /api/sales/by-product:
 *   get:
 *     summary: Get sales by product
 *     tags: [Sales]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Sales by product metrics
 */
router.get('/by-product', salesController.getByProduct);

/**
 * @swagger
 * /api/sales/by-customer:
 *   get:
 *     summary: Get sales by customer
 *     tags: [Sales]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Sales by customer metrics
 */
router.get('/by-customer', salesController.getByCustomer);

/**
 * @swagger
 * /api/sales/by-region:
 *   get:
 *     summary: Get sales by region
 *     tags: [Sales]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Sales by region metrics
 */
router.get('/by-region', salesController.getByRegion);

/**
 * @swagger
 * /api/sales/forecast:
 *   get:
 *     summary: Get sales forecast
 *     tags: [Sales]
 *     parameters:
 *       - in: query
 *         name: periods
 *         schema:
 *           type: integer
 *           enum: [3, 6, 12]
 *         description: Number of periods to forecast
 *     responses:
 *       200:
 *         description: Sales forecast data
 */
router.get('/forecast', salesController.getForecast);

/**
 * @swagger
 * /api/sales/receivables:
 *   get:
 *     summary: Get accounts receivable metrics
 *     tags: [Sales]
 *     responses:
 *       200:
 *         description: Accounts receivable metrics
 */
router.get('/receivables', salesController.getReceivables);

export default router;