'use strict';

/**
 * meet.service.js
 *
 * Google Meet REST API Service
 * Interacts directly with Google Meet REST API endpoints to manage spaces
 * and retrieve conference information.
 */

const { google } = require('googleapis');
const { getAuthorizedClientForUser } = require('./google.service');

/**
 * Creates a Google Meet Space using Google Meet REST API v2
 * @param {string} organizerId
 */
async function createMeetSpace(organizerId) {
  try {
    const auth = await getAuthorizedClientForUser(organizerId);
    
    // Attempt using google.meet v2
    if (google.meet) {
      const meet = google.meet({ version: 'v2', auth });
      const res = await meet.spaces.create({
        requestBody: {},
      });
      return {
        name: res.data.name,
        meetingUri: res.data.meetingUri,
        meetingCode: res.data.meetingCode,
      };
    }
  } catch (error) {
    console.warn('[meet.service] Failed to create Google Meet space via REST API:', error.message);
  }
  return null;
}

/**
 * Retrieves details for a Google Meet Space
 * @param {string} organizerId
 * @param {string} spaceName
 */
async function getMeetSpaceInfo(organizerId, spaceName) {
  try {
    const auth = await getAuthorizedClientForUser(organizerId);
    if (google.meet && spaceName) {
      const meet = google.meet({ version: 'v2', auth });
      const res = await meet.spaces.get({ name: spaceName });
      return res.data;
    }
  } catch (error) {
    console.warn('[meet.service] Failed to retrieve Meet space info:', error.message);
  }
  return null;
}

module.exports = {
  createMeetSpace,
  getMeetSpaceInfo,
};
