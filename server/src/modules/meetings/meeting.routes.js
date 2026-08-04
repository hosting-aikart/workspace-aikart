'use strict';

/**
 * meeting.routes.js
 *
 * REST API routes for Meetings Module.
 */

const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const {
  createMeetingHandler,
  listMeetingsHandler,
  getMeetingHandler,
  updateMeetingHandler,
  cancelMeetingHandler,
  respondToInvitationHandler,
  joinMeetingHandler,
} = require('./meeting.controller');

const router = Router();

router.use(requireAuth);

router.post('/', createMeetingHandler);
router.get('/', listMeetingsHandler);
router.get('/:id', getMeetingHandler);
router.put('/:id', updateMeetingHandler);
router.patch('/:id', updateMeetingHandler);
router.post('/:id/cancel', cancelMeetingHandler);
router.post('/:id/respond', respondToInvitationHandler);
router.post('/:id/join', joinMeetingHandler);

module.exports = router;
