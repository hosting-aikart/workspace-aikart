'use strict';

/**
 * meeting.service.js
 *
 * Core business logic for AIKart Workspace Meeting Module.
 * Integrates PostgreSQL (Prisma), Google Calendar API, Google Meet REST API,
 * CRM notifications, and Email invitations.
 */

const prismaModule = require('../../config/prisma');
const { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('../google/calendar.service');
const { createMeetSpace } = require('../google/meet.service');

const getPrisma = () => prismaModule.getPrisma();

/**
 * Helper: Safely attempt to send an email invitation
 */
async function safeSendEmailInvite(organizerId, recipientEmail, meetingData) {
  try {
    const { sendEmail } = require('../email/email.service');
    const subject = `Invitation: ${meetingData.title}`;
    const body = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
        <h2 style="color: #4461F2; margin-top: 0;">${meetingData.title}</h2>
        <p>You have been invited to a meeting by <strong>${meetingData.organizerName}</strong>.</p>
        <div style="background: #f8fafc; border-left: 4px solid #4461F2; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0;"><strong>Date & Time:</strong> ${new Date(meetingData.startTime).toLocaleString()} - ${new Date(meetingData.endTime).toLocaleTimeString()}</p>
          <p style="margin: 0 0 8px 0;"><strong>Type:</strong> ${meetingData.meetingType}</p>
          ${meetingData.agenda ? `<p style="margin: 0;"><strong>Agenda:</strong> ${meetingData.agenda}</p>` : ''}
        </div>
        ${
          meetingData.meetingUrl
            ? `<div style="margin-top: 25px;">
                <a href="${meetingData.meetingUrl}" target="_blank" style="background: #4461F2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Join Google Meet
                </a>
               </div>`
            : ''
        }
      </div>
    `;

    await sendEmail(organizerId, {
      to: recipientEmail,
      subject,
      body,
      isHtml: true,
    });
  } catch (err) {
    console.warn(`[meeting.service] Optional email notification to ${recipientEmail} skipped:`, err.message);
  }
}

/**
 * Helper: Safely create a CRM Notification for meeting invitees
 */
async function safeCreateCRMNotification(prisma, workspaceId, organizerId, participantUserIds, meetingTitle) {
  try {
    const announcement = await prisma.announcement.create({
      data: {
        title: `New Meeting: ${meetingTitle}`,
        description: `You have been invited to a new meeting: "${meetingTitle}". Please check your Meetings tab to respond.`,
        priority: 'HIGH',
        targetType: 'SELECTED_USERS',
        status: 'PUBLISHED',
        workspaceId,
        createdById: organizerId,
        selectedUsers: {
          create: participantUserIds.map((userId) => ({ userId })),
        },
      },
    });
    return announcement;
  } catch (err) {
    console.warn('[meeting.service] CRM Notification creation skipped:', err.message);
    return null;
  }
}

/**
 * Validate whether a Manager is authorized to invite specific employee IDs
 */
async function validateManagerInvitees(prisma, workspaceId, managerId, participantIds) {
  if (!participantIds || participantIds.length === 0) return true;

  // Find employees in manager's managed projects or direct reports
  const managedProjects = await prisma.project.findMany({
    where: { workspaceId, managerId },
    select: { members: { select: { userId: true } } },
  });

  const projectUserIds = new Set(
    managedProjects.flatMap((p) => p.members.map((m) => m.userId))
  );

  const directReports = await prisma.user.findMany({
    where: { workspaceId, reportingManagerId: managerId },
    select: { id: true },
  });
  directReports.forEach((r) => projectUserIds.add(r.id));

  // Verify all requested participantIds belong to manager's team
  const unauthorized = participantIds.filter((id) => id !== managerId && !projectUserIds.has(id));
  if (unauthorized.length > 0) {
    const err = new Error('Managers can only schedule meetings with employees assigned to their projects or team.');
    err.statusCode = 403;
    throw err;
  }
  return true;
}

/**
 * Create Meeting (Scheduled or Instant)
 */
async function createMeeting(workspaceId, user, data) {
  const prisma = getPrisma();

  const {
    title,
    description,
    agenda,
    meetingType = 'SCHEDULED',
    startTime,
    endTime,
    participantIds = [],
    externalEmails = [],
  } = data;

  if (!title || !title.trim()) {
    const err = new Error('Meeting title is required.');
    err.statusCode = 400;
    throw err;
  }


  if (user.role === 'MANAGER' && meetingType !== 'INSTANT') {
    await validateManagerInvitees(prisma, workspaceId, user.id, participantIds);
  }

  // 2. Normalize Meeting Times
  let now = new Date();
  let start = meetingType === 'INSTANT' ? now : new Date(startTime || now);
  let end =
    meetingType === 'INSTANT'
      ? new Date(now.getTime() + 30 * 60 * 1000)
      : new Date(endTime || start.getTime() + 30 * 60 * 1000);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const err = new Error('Invalid meeting start or end time.');
    err.statusCode = 400;
    throw err;
  }

  // 3. Fetch participant email addresses
  const uniqueParticipantIds = Array.from(new Set([...participantIds, user.id]));
  const participantsList = await prisma.user.findMany({
    where: {
      id: { in: uniqueParticipantIds },
      workspaceId,
    },
    select: { id: true, email: true, name: true },
  });

  const attendeeEmails = participantsList
    .filter((p) => p.id !== user.id)
    .map((p) => p.email)
    .concat(externalEmails);

  // 4. Integrate with Google Calendar & Google Meet REST APIs
  let googleEventId = null;
  let meetingUrl = null;
  let googleMeetSpaceId = null;

  // Try creating Meet Space via REST API first
  const meetSpaceResult = await createMeetSpace(user.id);
  if (meetSpaceResult) {
    meetingUrl = meetSpaceResult.meetingUri;
    googleMeetSpaceId = meetSpaceResult.name;
  }

  // Create Google Calendar Event (which also creates Google Meet conference link)
  const calResult = await createCalendarEvent(user.id, {
    title,
    description,
    agenda,
    startTime: start,
    endTime: end,
    attendeesEmails: attendeeEmails,
  });

  if (calResult) {
    googleEventId = calResult.eventId;
    if (!meetingUrl && calResult.meetLink) {
      meetingUrl = calResult.meetLink;
    }
  }

  // Fallback meeting URL if Google Meet link is not generated
  if (!meetingUrl) {
    meetingUrl = `https://meet.jit.si/aikart-room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  const initialStatus = meetingType === 'INSTANT' ? 'ONGOING' : 'UPCOMING';

  // 5. Store Meeting in PostgreSQL CRM Source of Truth
  const meeting = await prisma.meeting.create({
    data: {
      title: title.trim(),
      description: description || null,
      agenda: agenda || null,
      workspaceId,
      organizerId: user.id,
      meetingType,
      status: initialStatus,
      googleEventId,
      googleMeetSpaceId,
      meetingUrl,
      startTime: start,
      endTime: end,
      participants: {
        create: [
          ...participantsList.map((p) => ({
            userId: p.id,
            email: p.email,
            participantType: 'INTERNAL',
            responseStatus: p.id === user.id ? 'ACCEPTED' : 'INVITED',
          })),
          ...externalEmails.map((email) => ({
            email,
            participantType: 'EXTERNAL',
            responseStatus: 'INVITED',
          })),
        ],
      },
    },
    include: {
      organizer: {
        select: { id: true, name: true, email: true, profilePhoto: true, position: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true, profilePhoto: true, position: true, role: true },
          },
        },
      },
    },
  });

  // 6. Send CRM In-App Notifications
  const invitedUserIds = participantsList.filter((p) => p.id !== user.id).map((p) => p.id);
  if (invitedUserIds.length > 0) {
    await safeCreateCRMNotification(prisma, workspaceId, user.id, invitedUserIds, title);
  }

  // 7. Send Email Invitations using Email Module
  const allInviteeEmails = [
    ...participantsList.filter((p) => p.id !== user.id).map((p) => p.email),
    ...externalEmails,
  ];

  if (allInviteeEmails.length > 0) {
    for (const email of allInviteeEmails) {
      safeSendEmailInvite(user.id, email, {
        title,
        organizerName: user.name || 'AIKart User',
        startTime: start,
        endTime: end,
        meetingType,
        agenda,
        meetingUrl,
      });
    }
  }

  return meeting;
}

/**
 * List Meetings with Role & Status Filtering
 */
async function listMeetings(workspaceId, user, options = {}) {
  const prisma = getPrisma();
  const { status, type, page = 1, limit = 50 } = options;

  const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const whereClause = {
    workspaceId,
  };

  if (status) {
    whereClause.status = status;
  }

  if (type) {
    whereClause.meetingType = type;
  }

  // Role Filtering Logic
  if (user.role === 'EMPLOYEE') {
    whereClause.OR = [
      { organizerId: user.id },
      { participants: { some: { userId: user.id } } },
    ];
  } else if (user.role === 'MANAGER') {
    whereClause.OR = [
      { organizerId: user.id },
      { participants: { some: { userId: user.id } } },
    ];
  }

  const [rawMeetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where: whereClause,
      include: {
        organizer: {
          select: { id: true, name: true, email: true, profilePhoto: true, position: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, profilePhoto: true, position: true, role: true },
            },
          },
        },
      },
      skip,
      take,
    }),
    prisma.meeting.count({ where: whereClause }),
  ]);

  const now = new Date();
  const meetings = rawMeetings.map((m) => {
    let currentStatus = m.status;
    if (m.status !== 'CANCELLED') {
      const start = new Date(m.startTime);
      const end = new Date(m.endTime);
      if (start <= now && now <= end) {
        currentStatus = 'ONGOING';
      } else if (now > end) {
        currentStatus = 'COMPLETED';
      }
    }
    return {
      ...m,
      status: currentStatus,
    };
  });

  // Custom sort:
  // 1. ONGOING meetings first
  // 2. UPCOMING meetings by nearest startTime asc
  // 3. COMPLETED & CANCELLED meetings by latest startTime desc
  meetings.sort((a, b) => {
    const statusOrder = { ONGOING: 1, UPCOMING: 2, COMPLETED: 3, CANCELLED: 4 };
    const orderA = statusOrder[a.status] || 5;
    const orderB = statusOrder[b.status] || 5;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    if (a.status === 'UPCOMING') {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }

    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  return {
    meetings,
    total,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(total / take),
  };
}

/**
 * Get Meeting Details
 */
async function getMeetingById(workspaceId, user, meetingId) {
  const prisma = getPrisma();

  const meeting = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      workspaceId,
    },
    include: {
      organizer: {
        select: { id: true, name: true, email: true, profilePhoto: true, position: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true, profilePhoto: true, position: true, role: true },
          },
        },
      },
    },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  // Employee / Manager check if they have access
  if (user.role !== 'ADMIN') {
    const isOrganizer = meeting.organizerId === user.id;
    const isParticipant = meeting.participants.some((p) => p.userId === user.id);
    if (!isOrganizer && !isParticipant) {
      const err = new Error('Access denied to this meeting.');
      err.statusCode = 403;
      throw err;
    }
  }

  return meeting;
}

/**
 * Edit Meeting (Admin or Organizer Manager)
 */
async function updateMeeting(workspaceId, user, meetingId, data) {
  const prisma = getPrisma();

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, workspaceId },
    include: { participants: true },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  // Role permissions: Admin can edit any meeting; Manager can edit only if organizer
  if (user.role === 'EMPLOYEE' || (user.role === 'MANAGER' && meeting.organizerId !== user.id)) {
    const err = new Error('You are not authorized to edit this meeting.');
    err.statusCode = 403;
    throw err;
  }

  const { title, description, agenda, startTime, endTime, participantIds, externalEmails } = data;

  const updateData = {};
  if (title) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description;
  if (agenda !== undefined) updateData.agenda = agenda;
  if (startTime) updateData.startTime = new Date(startTime);
  if (endTime) updateData.endTime = new Date(endTime);

  // If participant list updated
  if (Array.isArray(participantIds) || Array.isArray(externalEmails)) {
    const internalIds = Array.isArray(participantIds) ? participantIds : meeting.participants.filter(p => p.participantType === 'INTERNAL').map(p => p.userId);
    const extEmails = Array.isArray(externalEmails) ? externalEmails : meeting.participants.filter(p => p.participantType === 'EXTERNAL').map(p => p.email);

    if (user.role === 'MANAGER') {
      await validateManagerInvitees(prisma, workspaceId, user.id, internalIds);
    }
    const uniqueIds = Array.from(new Set([...internalIds, meeting.organizerId]));
    
    // Delete old participants not in list
    await prisma.meetingParticipant.deleteMany({
      where: {
        meetingId,
        OR: [
          { userId: { notIn: uniqueIds }, participantType: 'INTERNAL' },
          { email: { notIn: extEmails }, participantType: 'EXTERNAL' },
        ],
      },
    });

    // Upsert internal participants
    for (const uId of uniqueIds) {
      const u = await prisma.user.findUnique({ where: { id: uId }, select: { email: true } });
      await prisma.meetingParticipant.upsert({
        where: { meetingId_userId: { meetingId, userId: uId } },
        create: { meetingId, userId: uId, email: u?.email, participantType: 'INTERNAL', responseStatus: uId === meeting.organizerId ? 'ACCEPTED' : 'INVITED' },
        update: {},
      });
    }

    // Create external participants
    for (const email of extEmails) {
      const existing = await prisma.meetingParticipant.findFirst({
        where: { meetingId, email, participantType: 'EXTERNAL' },
      });
      if (!existing) {
        await prisma.meetingParticipant.create({
          data: { meetingId, email, participantType: 'EXTERNAL', responseStatus: 'INVITED' },
        });
      }
    }
  }

  const updatedMeeting = await prisma.meeting.update({
    where: { id: meetingId },
    data: updateData,
    include: {
      organizer: {
        select: { id: true, name: true, email: true, profilePhoto: true, position: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true, profilePhoto: true, position: true, role: true },
          },
        },
      },
    },
  });

  // Sync with Google Calendar if event exists
  if (meeting.googleEventId) {
    const attendeeEmails = updatedMeeting.participants
      .filter((p) => p.userId !== meeting.organizerId)
      .map((p) => p.participantType === 'INTERNAL' ? p.user?.email : p.email)
      .filter(Boolean);

    updateCalendarEvent(user.id, meeting.googleEventId, {
      title: updatedMeeting.title,
      description: updatedMeeting.description,
      agenda: updatedMeeting.agenda,
      startTime: updatedMeeting.startTime,
      endTime: updatedMeeting.endTime,
      attendeesEmails: attendeeEmails,
    });
  }

  return updatedMeeting;
}

/**
 * Delete Meeting (Admin, Manager, or Organizer)
 */
async function deleteMeeting(workspaceId, user, meetingId) {
  const prisma = getPrisma();

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, workspaceId },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  // Only Admin, Manager, or the original Organizer can delete the meeting
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && meeting.organizerId !== user.id) {
    const err = new Error('You are not authorized to delete this meeting.');
    err.statusCode = 403;
    throw err;
  }

  // Delete from Google Calendar if event exists
  if (meeting.googleEventId) {
    deleteCalendarEvent(user.id, meeting.googleEventId);
  }

  const deletedMeeting = await prisma.meeting.delete({
    where: { id: meetingId },
  });

  return deletedMeeting;
}

/**
 * Respond to Meeting Invitation (ACCEPTED / DECLINED)
 */
async function respondToInvitation(workspaceId, user, meetingId, responseStatus) {
  const prisma = getPrisma();

  if (!['ACCEPTED', 'DECLINED'].includes(responseStatus)) {
    const err = new Error('Response status must be ACCEPTED or DECLINED.');
    err.statusCode = 400;
    throw err;
  }

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, workspaceId },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  const participant = await prisma.meetingParticipant.upsert({
    where: {
      meetingId_userId: {
        meetingId,
        userId: user.id,
      },
    },
    create: {
      meetingId,
      userId: user.id,
      responseStatus,
    },
    update: {
      responseStatus,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return participant;
}

/**
 * Record Join Event
 */
async function joinMeeting(workspaceId, user, meetingId) {
  const prisma = getPrisma();

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, workspaceId },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  await prisma.meetingParticipant.upsert({
    where: {
      meetingId_userId: {
        meetingId,
        userId: user.id,
      },
    },
    create: {
      meetingId,
      userId: user.id,
      responseStatus: 'JOINED',
    },
    update: {
      responseStatus: 'JOINED',
    },
  });

  const now = new Date();
  if (meeting.status === 'UPCOMING' && new Date(meeting.startTime) <= now && now <= new Date(meeting.endTime)) {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'ONGOING' },
    });
  }

  const fallbackUrl = meeting.meetingUrl || `https://meet.jit.si/aikart-room-${meeting.id}`;

  return { meetingUrl: fallbackUrl };
}

module.exports = {
  createMeeting,
  listMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  respondToInvitation,
  joinMeeting,
};
