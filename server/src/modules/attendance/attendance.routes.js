const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./attendance.controller');

const router = Router();

router.use(requireAuth); // every route here requires a logged-in user

router.post('/check-in', controller.checkIn);
router.post('/pause', controller.pause);
router.post('/resume', controller.resume);
router.post('/check-out', controller.checkOut);
router.get('/today', controller.today);
router.get('/history', controller.history);
router.get('/summary/weekly', controller.weeklySummary);
router.get('/summary/monthly', controller.monthlySummary);

module.exports = router;