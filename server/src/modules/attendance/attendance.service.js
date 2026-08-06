const { getPrisma } = require('../../config/prisma');

const startOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Finds today's attendance record for a user, creating it if it doesn't exist yet.
 */
const getOrCreateTodayAttendance = async (userId) => {
    const prisma = getPrisma();
    const today = startOfDay();

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