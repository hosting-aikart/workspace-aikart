'use strict';

/**
 * calendar.service.js
 *
 * Google Calendar API Service
 * Manages Google Calendar event creation, updates, deletions, and
 * automatic Google Meet conference link generation.
 */

const { google } = require('googleapis');
const { getAuthorizedClientForUser } = require('./google.service');

/**
 * Create a Google Calendar Event with dynamic Google Meet video conference
 * @param {string} organizerId
 * @param {Object} eventData
 * @param {string} eventData.title
 * @param {string} [eventData.description]
 * @param {string} [eventData.agenda]
 * @param {Date|string} eventData.startTime
 * @param {Date|string} eventData.endTime
 * @param {string[]} [eventData.attendeesEmails]
 */
async function createCalendarEvent(organizerId, { title, description, agenda, startTime, endTime, attendeesEmails = [] }) {
  try {
    const auth = await getAuthorizedClientForUser(organizerId);
    const calendar = google.calendar({ version: 'v3', auth });

    const formattedDescription = [
      description || '',
      agenda ? `\n\nAgenda:\n${agenda}` : '',
    ].filter(Boolean).join('');

    const event = {
      summary: title,
      description: formattedDescription,
      start: { dateTime: new Date(startTime).toISOString() },
      end: { dateTime: new Date(endTime).toISOString() },
      attendees: attendeesEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    const meetUri =
      res.data.hangoutsLink ||
      res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
      null;

    return {
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
      meetLink: meetUri,
      conferenceData: res.data.conferenceData || null,
    };
  } catch (error) {
    console.warn('[calendar.service] Failed to create Google Calendar event:', error.message);
    return null;
  }
}

/**
 * Update an existing Google Calendar Event
 * @param {string} organizerId
 * @param {string} googleEventId
 * @param {Object} eventData
 */
async function updateCalendarEvent(organizerId, googleEventId, { title, description, agenda, startTime, endTime, attendeesEmails }) {
  if (!googleEventId) return null;
  try {
    const auth = await getAuthorizedClientForUser(organizerId);
    const calendar = google.calendar({ version: 'v3', auth });

    const formattedDescription = [
      description || '',
      agenda ? `\n\nAgenda:\n${agenda}` : '',
    ].filter(Boolean).join('');

    const patchData = {};
    if (title) patchData.summary = title;
    if (description !== undefined || agenda !== undefined) patchData.description = formattedDescription;
    if (startTime) patchData.start = { dateTime: new Date(startTime).toISOString() };
    if (endTime) patchData.end = { dateTime: new Date(endTime).toISOString() };
    if (Array.isArray(attendeesEmails)) {
      patchData.attendees = attendeesEmails.map((email) => ({ email }));
    }

    const res = await calendar.events.patch({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: patchData,
      sendUpdates: 'all',
    });

    return {
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
      meetLink: res.data.hangoutsLink || res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri || null,
    };
  } catch (error) {
    console.warn('[calendar.service] Failed to update Google Calendar event:', error.message);
    return null;
  }
}

/**
 * Delete a Google Calendar Event
 * @param {string} organizerId
 * @param {string} googleEventId
 */
async function deleteCalendarEvent(organizerId, googleEventId) {
  if (!googleEventId) return null;
  try {
    const auth = await getAuthorizedClientForUser(organizerId);
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
      sendUpdates: 'all',
    });

    return true;
  } catch (error) {
    console.warn('[calendar.service] Failed to delete Google Calendar event:', error.message);
    return false;
  }
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
};
