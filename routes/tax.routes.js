import express from 'express';
import { calculateTax } from '../controller/tax.controller.js';

const router = express.Router();

// Calculate tax
router.post('/calculate', calculateTax);

export default router;
