const { getPrisma } = require('../../config/prisma');

const startOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

// Cap on how much time a forgotten check-out can credit for a single
// segment (e.g. the browser was closed mid-shift and never reopened). Without
// this, a session abandoned for days would otherwise inflate that day's
// total to however long it took the person to notice — a genuine full shift
// is comfortably under this, so it only ever clips truly abandoned sessions.
const MAX_ABANDONED_SEGMENT_HOURS = 12;

/**
 * Auto-closes any attendance record left WORKING/PAUSED from a *previous*
 * day — the browser closing (or crashing, or the laptop sleeping) mid-shift
 * without an explicit check-out otherwise leaves that day stuck showing
 * "Working" forever, with its total hours frozen at whatever was persisted
 * before the abandoned segment started (checkOut and totalSeconds are only
 * ever written by pauseTimer/checkOut, so an open segment that's never
 * closed just never contributes). Each open segment is closed at
 * min(startedAt + MAX_ABANDONED_SEGMENT_HOURS, end of that calendar day) so
 * the credited time stays plausible, the day gets a real checkOut, and its
 * history stops looking permanently unfinished.
 *
 * Runs against a single user (called from that user's own attendance
 * actions/page loads) rather than as a global sweep — an admin viewing
 * someone else's history sees it reconciled once that person's own next
 * check-in/page load triggers this.
 */
const reconcileStaleAttendance = async (userId) => {
    const prisma = getPrisma();
    const today = startOfDay();

    const stale = await prisma.attendance.findMany({
        where: {
            userId,
            date: { lt: today },
            status: { in: ['WORKING', 'PAUSED'] },
        },
        include: { timerSegments: true },
    });

    for (const attendance of stale) {
        const running = attendance.timerSegments.find((s) => !s.endedAt);
        let addedSeconds = 0;
        let closedAt = attendance.updatedAt;

        if (running) {
            const startedAt = new Date(running.startedAt);
            const cap = new Date(Math.min(
                startedAt.getTime() + MAX_ABANDONED_SEGMENT_HOURS * 60 * 60 * 1000,
                endOfDay(attendance.date).getTime(),
            ));
            addedSeconds = Math.max(0, Math.floor((cap.getTime() - startedAt.getTime()) / 1000));
            closedAt = cap;

            await prisma.timerSegment.update({
                where: { id: running.id },
                data: { endedAt: cap },
            });
        }

        await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                totalSeconds: attendance.totalSeconds + addedSeconds,
                checkOut: closedAt,
                status: 'CHECKED_OUT',
            },
        });
    }
};

/**
 * Finds today's attendance record for a user, creating it if it doesn't exist yet.
 */
const getOrCreateTodayAttendance = async (userId) => {
    const prisma = getPrisma();
    const today = startOfDay();

    await reconcileStaleAttendance(userId);

    let attendance = await prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } },
        include: { timerSegments: true },
    });

    if (!attendance) {
        attendance = await prisma.attendance.create({
            data: { userId, date: today },
            include: { timerSegments: true },
        });
    }

    return attendance;
};

/**
 * Computes total worked seconds so far today, including the currently
 * running segment (if any).
 */
const computeLiveTotalSeconds = (attendance) => {
    let total = attendance.totalSeconds;
    const running = attendance.timerSegments.find((s) => !s.endedAt);
    if (running) {
        total += Math.floor((Date.now() - new Date(running.startedAt).getTime()) / 1000);
    }
    return total;
};

/**
 * Check in: sets checkIn time (if not already set), starts a new timer segment,
 * moves status to WORKING.
 */
const checkIn = async (userId) => {
    const prisma = getPrisma();
    const attendance = await getOrCreateTodayAttendance(userId);

    if (attendance.status === 'WORKING') {
        throw new Error('Already checked in and working.');
    }
    if (attendance.status === 'CHECKED_OUT') {
        throw new Error('Already checked out for today.');
    }

    const updated = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
            checkIn: attendance.checkIn ?? new Date(),
            status: 'WORKING',
            timerSegments: { create: { startedAt: new Date() } },
        },
        include: { timerSegments: true },
    });

    return updated;
};

/**
 * Pause: closes the currently running segment, folds its duration into
 * totalSeconds, moves status to PAUSED.
 */
const pauseTimer = async (userId) => {
    const prisma = getPrisma();
    const attendance = await getOrCreateTodayAttendance(userId);

    if (attendance.status !== 'WORKING') {
        throw new Error('Timer is not currently running.');
    }

    const running = attendance.timerSegments.find((s) => !s.endedAt);
    const now = new Date();
    const segmentSeconds = running
        ? Math.floor((now.getTime() - new Date(running.startedAt).getTime()) / 1000)
        : 0;

    const updated = await prisma.$transaction(async (tx) => {
        if (running) {
            await tx.timerSegment.update({
                where: { id: running.id },
                data: { endedAt: now },
            });
        }
        return tx.attendance.update({
            where: { id: attendance.id },
            data: {
                totalSeconds: attendance.totalSeconds + segmentSeconds,
                status: 'PAUSED',
            },
            include: { timerSegments: true },
        });
    });

    return updated;
};

/**
 * Resume: starts a fresh timer segment, moves status back to WORKING.
 */
const resumeTimer = async (userId) => {
    const prisma = getPrisma();
    const attendance = await getOrCreateTodayAttendance(userId);

    if (attendance.status !== 'PAUSED') {
        throw new Error('Timer is not currently paused.');
    }

    const updated = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
            status: 'WORKING',
            timerSegments: { create: { startedAt: new Date() } },
        },
        include: { timerSegments: true },
    });

    return updated;
};

/**
 * Check out: closes any running segment, folds its duration in, sets
 * checkOut time, moves status to CHECKED_OUT — locks the day.
 */
const checkOut = async (userId) => {
    const prisma = getPrisma();
    const attendance = await getOrCreateTodayAttendance(userId);

    if (attendance.status === 'CHECKED_OUT') {
        throw new Error('Already checked out for today.');
    }
    if (attendance.status === 'NOT_STARTED') {
        throw new Error('Cannot check out before checking in.');
    }

    const running = attendance.timerSegments.find((s) => !s.endedAt);
    const now = new Date();
    const segmentSeconds = running
        ? Math.floor((now.getTime() - new Date(running.startedAt).getTime()) / 1000)
        : 0;

    const updated = await prisma.$transaction(async (tx) => {
        if (running) {
            await tx.timerSegment.update({
                where: { id: running.id },
                data: { endedAt: now },
            });
        }
        return tx.attendance.update({
            where: { id: attendance.id },
            data: {
                totalSeconds: attendance.totalSeconds + segmentSeconds,
                checkOut: now,
                status: 'CHECKED_OUT',
            },
            include: { timerSegments: true },
        });
    });

    return updated;
};

/**
 * Returns today's attendance with a live-computed total (includes
 * currently running segment time, not just what's persisted).
 */
const getTodayStatus = async (userId) => {
    const attendance = await getOrCreateTodayAttendance(userId);
    return {
        ...attendance,
        liveTotalSeconds: computeLiveTotalSeconds(attendance),
    };
};

/**
 * Returns attendance history for a user within an optional date range,
 * most recent first.
 */
const getHistory = async (userId, { from, to } = {}) => {
    const prisma = getPrisma();

    // Doesn't route through getOrCreateTodayAttendance like the other
    // actions, so it needs its own call to pick up any stale WORKING/PAUSED
    // day before returning history for it.
    await reconcileStaleAttendance(userId);

    const where = { userId };
    if (from || to) {
        where.date = {};
        if (from) where.date.gte = startOfDay(new Date(from));
        if (to) where.date.lte = startOfDay(new Date(to));
    }

    return prisma.attendance.findMany({
        where,
        orderBy: { date: 'desc' },
    });
};

/**
 * Aggregates total worked seconds for weekly/monthly summaries.
 */
const getAggregate = async (userId, { from, to }) => {
    const records = await getHistory(userId, { from, to });
    return records.reduce((sum, r) => sum + r.totalSeconds, 0);
};

module.exports = {
    checkIn,
    pauseTimer,
    resumeTimer,
    checkOut,
    getTodayStatus,
    getHistory,
    getAggregate,
};