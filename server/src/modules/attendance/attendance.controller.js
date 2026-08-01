const service = require('./attendance.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const checkIn = async (req, res) => {
    try {
        const result = await service.checkIn(req.user.id);
        return sendSuccess(res, result);
    } catch (err) {
        return sendError(res, err.message, 400);
    }
};

const pause = async (req, res) => {
    try {
        const result = await service.pauseTimer(req.user.id);
        return sendSuccess(res, result);
    } catch (err) {
        return sendError(res, err.message, 400);
    }
};

const resume = async (req, res) => {
    try {
        const result = await service.resumeTimer(req.user.id);
        return sendSuccess(res, result);
    } catch (err) {
        return sendError(res, err.message, 400);
    }
};

const checkOut = async (req, res) => {
    try {
        const result = await service.checkOut(req.user.id);
        return sendSuccess(res, result);
    } catch (err) {
        return sendError(res, err.message, 400);
    }
};

const today = async (req, res) => {
    try {
        const result = await service.getTodayStatus(req.user.id);
        return sendSuccess(res, result);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

const history = async (req, res) => {
    try {
        const { from, to } = req.query;
        const result = await service.getHistory(req.user.id, { from, to });
        return sendSuccess(res, result);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

const weeklySummary = async (req, res) => {
    try {
        const now = new Date();
        const from = new Date(now);
        from.setDate(now.getDate() - 6);
        const totalSeconds = await service.getAggregate(req.user.id, { from, to: now });
        return sendSuccess(res, { totalSeconds });
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

const monthlySummary = async (req, res) => {
    try {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalSeconds = await service.getAggregate(req.user.id, { from, to: now });
        return sendSuccess(res, { totalSeconds });
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

module.exports = { checkIn, pause, resume, checkOut, today, history, weeklySummary, monthlySummary };