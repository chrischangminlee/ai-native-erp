import express from 'express';
import * as financeController from '../controllers/financeController.js';

const router = express.Router();

/**
 * @swagger
 * /api/finance/dashboard:
 *   get:
 *     summary: Get P&L dashboard metrics
 *     tags: [Finance]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: P&L dashboard metrics
 */
router.get('/dashboard', financeController.getDashboard);

/**
 * @swagger
 * /api/finance/by-dept:
 *   get:
 *     summary: Get P&L by department
 *     tags: [Finance]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: P&L by department metrics
 */
router.get('/by-dept', financeController.getByDepartment);

/**
 * @swagger
 * /api/finance/by-product:
 *   get:
 *     summary: Get P&L by product
 *     tags: [Finance]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: P&L by product metrics
 */
router.get('/by-product', financeController.getByProduct);

/**
 * @swagger
 * /api/finance/cost-structure:
 *   get:
 *     summary: Get fixed vs variable cost analysis
 *     tags: [Finance]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Cost structure analysis
 */
router.get('/cost-structure', financeController.getCostStructure);

/**
 * @swagger
 * /api/finance/variance:
 *   get:
 *     summary: Get cost variance analysis
 *     tags: [Finance]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Cost variance metrics
 */
router.get('/variance', financeController.getVariance);

/**
 * @swagger
 * /api/finance/cashflow:
 *   get:
 *     summary: Get cashflow and financial ratios
 *     tags: [Finance]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Cashflow and ratio metrics
 */
router.get('/cashflow', financeController.getCashflow);

export default router;