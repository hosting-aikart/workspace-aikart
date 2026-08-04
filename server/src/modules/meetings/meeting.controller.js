'use strict';

/**
 * meeting.controller.js
 *
 * Thin HTTP controller for Meetings module.
 * Parses input, handles Zod validation, and delegates business logic to meeting.service.js.
 */

const { z } = require('zod');
const meetingService = require('./meeting.service');

const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  agenda: z.string().optional(),
  meetingType: z.enum(['SCHEDULED', 'INSTANT']).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
});

const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  agenda: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
});

const respondSchema = z.object({
  responseStatus: z.enum(['ACCEPTED', 'DECLINED']),
});

async function createMeetingHandler(req, res) {
  try {
    const payload = createMeetingSchema.parse(req.body);
    const meeting = await meetingService.createMeeting(
      req.user.workspaceId,
      req.user,
      payload
    );
    return res.status(201).json({ status: 'success', data: meeting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ status: 'error', message: error.message });
  }
}

async function listMeetingsHandler(req, res) {
  try {
    const result = await meetingService.listMeetings(
      req.user.workspaceId,
      req.user,
      {
        status: req.query.status,
        type: req.query.type,
        page: req.query.page,
        limit: req.query.limit,
      }
    );
    return res.json({ status: 'success', data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ status: 'error', message: error.message });
  }
}

async function getMeetingHandler(req, res) {
  try {
    const { id } = req.params;
    const meeting = await meetingService.getMeetingById(
      req.user.workspaceId,
      req.user,
      id
    );
    return res.json({ status: 'success', data: meeting });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ status: 'error', message: error.message });
  }
}

async function updateMeetingHandler(req, res) {
  try {
    const { id } = req.params;
    const payload = updateMeetingSchema.parse(req.body);
    const meeting = await meetingService.updateMeeting(
      req.user.workspaceId,
      req.user,
      id,
      payload
    );
    return res.json({ status: 'success', data: meeting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ status: 'error', message: error.message });
  }
}

async function cancelMeetingHandler(req, res) {
  try {
    const { id } = req.params;
    const meeting = await meetingService.cancelMeeting(
      req.user.workspaceId,
      req.user,
      id
    );
    return res.json({ status: 'success', data: meeting, message: 'Meeting cancelled successfully' });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ status: 'error', message: error.message });
  }
}

async function respondToInvitationHandler(req, res) {
  try {
    const { id } = req.params;
    const { responseStatus } = respondSchema.parse(req.body);
    const participant = await meetingService.respondToInvitation(
      req.user.workspaceId,
      req.user,
      id,
      responseStatus
    );
    return res.json({ status: 'success', data: participant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ status: 'error', message: error.message });
  }
}

async function joinMeetingHandler(req, res) {
  try {
    const { id } = req.params;
    const result = await meetingService.joinMeeting(
      req.user.workspaceId,
      req.user,
      id
    );
    return res.json({ status: 'success', data: result });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ status: 'error', message: error.message });
  }
}

module.exports = {
  createMeetingHandler,
  listMeetingsHandler,
  getMeetingHandler,
  updateMeetingHandler,
  cancelMeetingHandler,
  respondToInvitationHandler,
  joinMeetingHandler,
};
