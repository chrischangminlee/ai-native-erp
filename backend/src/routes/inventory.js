import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';

const router = express.Router();

/**
 * @swagger
 * /api/inventory/dashboard:
 *   get:
 *     summary: Get inventory dashboard metrics
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Inventory dashboard metrics
 */
router.get('/dashboard', inventoryController.getDashboard);

/**
 * @swagger
 * /api/inventory/by-item:
 *   get:
 *     summary: Get inventory by item
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: warehouse_id
 *         schema:
 *           type: integer
 *         description: Filter by warehouse
 *     responses:
 *       200:
 *         description: Inventory by item metrics
 */
router.get('/by-item', inventoryController.getByItem);

/**
 * @swagger
 * /api/inventory/expiry:
 *   get:
 *     summary: Get lot and expiry information
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: days_ahead
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Days ahead to check for expiry
 *     responses:
 *       200:
 *         description: Lot and expiry data
 */
router.get('/expiry', inventoryController.getExpiry);

/**
 * @swagger
 * /api/inventory/history:
 *   get:
 *     summary: Get inventory movement history
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for history
 *     responses:
 *       200:
 *         description: Inventory movement history
 */
router.get('/history', inventoryController.getHistory);

/**
 * @swagger
 * /api/inventory/valuation:
 *   get:
 *     summary: Get inventory valuation
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [FIFO, LIFO, AVERAGE]
 *         description: Valuation method
 *     responses:
 *       200:
 *         description: Inventory valuation data
 */
router.get('/valuation', inventoryController.getValuation);

/**
 * @swagger
 * /api/inventory/risk:
 *   get:
 *     summary: Get inventory risk analysis
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Inventory risk metrics
 */
router.get('/risk', inventoryController.getRisk);

export default router;