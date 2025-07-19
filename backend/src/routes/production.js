import express from 'express';
import * as productionController from '../controllers/productionController.js';

const router = express.Router();

/**
 * @swagger
 * /api/production/output:
 *   get:
 *     summary: Get monthly production output
 *     tags: [Production]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Production output metrics
 */
router.get('/output', productionController.getOutput);

/**
 * @swagger
 * /api/production/by-process:
 *   get:
 *     summary: Get production metrics by process
 *     tags: [Production]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Production by process metrics
 */
router.get('/by-process', productionController.getByProcess);

/**
 * @swagger
 * /api/production/usage:
 *   get:
 *     summary: Get material usage analysis
 *     tags: [Production]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Material usage metrics
 */
router.get('/usage', productionController.getUsage);

/**
 * @swagger
 * /api/production/defects:
 *   get:
 *     summary: Get defects and scrap analysis
 *     tags: [Production]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Defects and scrap metrics
 */
router.get('/defects', productionController.getDefects);

/**
 * @swagger
 * /api/production/equipment:
 *   get:
 *     summary: Get equipment utilization metrics
 *     tags: [Production]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Equipment utilization data
 */
router.get('/equipment', productionController.getEquipment);

/**
 * @swagger
 * /api/production/wip:
 *   get:
 *     summary: Get work in progress status
 *     tags: [Production]
 *     responses:
 *       200:
 *         description: WIP status metrics
 */
router.get('/wip', productionController.getWIP);

export default router;