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
  deleteMeetingHandler,
  respondToInvitationHandler,
  joinMeetingHandler,
} = require('./meeting.controller');

const router = Router();

router.use(requireAuth);

// Create a new meeting (invites sent to selected users / external)
router.post('/', createMeetingHandler);

// List meetings for the current user
router.get('/', listMeetingsHandler);

// Get specific meeting details
router.get('/:id', getMeetingHandler);

// Update a meeting
router.patch('/:id', updateMeetingHandler);

// Delete a meeting completely (instead of cancel)
router.delete('/:id', deleteMeetingHandler);
router.post('/:id/respond', respondToInvitationHandler);
router.post('/:id/join', joinMeetingHandler);

module.exports = router;
