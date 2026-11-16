const pool = require("../config/db");

// Validate selected date
const validateDate = (date) => {
    if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        return false;
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date
    );
};


// Get report statistics
const getStatistics = async (userId, startDate, endDate) => {
    const result = await pool.query(
        `SELECT
            MAX(glucose_value) AS highest,
            MIN(glucose_value) AS lowest,
            ROUND(AVG(glucose_value), 1) AS average,
            COUNT(*) AS total_readings
         FROM readings
         WHERE user_id = $1
         AND reading_date >= $2
         AND reading_date <= $3`,
        [userId, startDate, endDate]
    );

    const row = result.rows[0];

    return {
        highest: row.highest === null ? null : Number(row.highest),
        lowest: row.lowest === null ? null : Number(row.lowest),
        average: row.average === null ? null : Number(row.average),
        total_readings: Number(row.total_readings)
    };
};


// DAILY REPORT
const getDailyReport = async (req, res) => {
    try {
        const userId = req.user.userId;
        const selectedDate = req.query.date;

        if (!validateDate(selectedDate)) {
            return res.status(400).json({
                message: "Please provide a valid date in YYYY-MM-DD format."
            });
        }

        const stats = await getStatistics(
            userId,
            selectedDate,
            selectedDate
        );

        const readingsResult = await pool.query(
            `SELECT id, reading_date, time_slot, glucose_value
             FROM readings
             WHERE user_id = $1
             AND reading_date = $2
             ORDER BY
                CASE time_slot
                    WHEN 'Morning' THEN 1
                    WHEN 'After breakfast' THEN 2
                    WHEN 'After lunch' THEN 3
                    WHEN 'After dinner' THEN 4
                END`,
            [userId, selectedDate]
        );

        return res.status(200).json({
            report: "Daily",
            date: selectedDate,
            ...stats,
            readings: readingsResult.rows
        });

    } catch (error) {
        console.error("Daily report error:", error.message);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// MONTH-TO-DATE REPORT
const getMonthToDateReport = async (req, res) => {
    try {
        const userId = req.user.userId;
        const selectedDate = req.query.date;

        if (!validateDate(selectedDate)) {
            return res.status(400).json({
                message: "Please provide a valid date in YYYY-MM-DD format."
            });
        }

        const dateCheck = await pool.query(
            "SELECT $1::date > CURRENT_DATE AS is_future",
            [selectedDate]
        );

        if (dateCheck.rows[0].is_future) {
            return res.status(400).json({
                message: "Date cannot be in the future."
            });
        }

        const startDate = `${selectedDate.slice(0, 7)}-01`;

        const stats = await getStatistics(
            userId,
            startDate,
            selectedDate
        );

        return res.status(200).json({
            report: "Month-to-date",
            start_date: startDate,
            end_date: selectedDate,
            ...stats
        });

    } catch (error) {
        console.error("Month-to-date report error:", error.message);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// PREVIOUS MONTH REPORT
const getMonthlyReport = async (req, res) => {
    try {
        const userId = req.user.userId;
        const selectedDate = req.query.date;

        if (!validateDate(selectedDate)) {
            return res.status(400).json({
                message: "Please provide a valid date in YYYY-MM-DD format."
            });
        }

        const dateCheck = await pool.query(
            "SELECT $1::date > CURRENT_DATE AS is_future",
            [selectedDate]
        );

        if (dateCheck.rows[0].is_future) {
            return res.status(400).json({
                message: "Date cannot be in the future."
            });
        }

        // First day of selected month
        const currentMonthStart = `${selectedDate.slice(0, 7)}-01`;

        // Last day of previous month
        const previousMonthEnd = new Date(
            `${currentMonthStart}T00:00:00.000Z`
        );

        previousMonthEnd.setUTCDate(0);

        const endDate = previousMonthEnd.toISOString().slice(0, 10);

        // First day of previous month
        const previousMonthStart = new Date(
            `${endDate}T00:00:00.000Z`
        );

        previousMonthStart.setUTCDate(1);

        const startDate = previousMonthStart.toISOString().slice(0, 10);

        const stats = await getStatistics(
            userId,
            startDate,
            endDate
        );

        return res.status(200).json({
            report: "Monthly",
            start_date: startDate,
            end_date: endDate,
            ...stats
        });

    } catch (error) {
        console.error("Monthly report error:", error.message);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


module.exports = {
    getDailyReport,
    getMonthToDateReport,
    getMonthlyReport
};