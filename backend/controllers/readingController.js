const pool = require("../config/db");

const allowedSlots = [
    "Morning",
    "After breakfast",
    "After lunch",
    "After dinner"
];

// CREATE READING
const createReading = async (req, res) => {
    try {
        const { reading_date, time_slot, glucose_value } = req.body || {};

        const userId = req.user.userId;

        // Validate required fields
        if (!reading_date || !time_slot || glucose_value === undefined || glucose_value === null || glucose_value === "") {
            return res.status(400).json({
                message: "Date, time slot and glucose value are required."
            });
        }

        // Validate date format and actual calendar date
        if (typeof reading_date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(reading_date)) {
            return res.status(400).json({
                message: "Please enter a valid date."
            });
        }

        const parsedDate = new Date(`${reading_date}T00:00:00.000Z`);

        if (Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== reading_date) {
            return res.status(400).json({
                message: "Please enter a valid date."
            });
        }

        // Validate future date
        const dateCheck = await pool.query(
            "SELECT $1::date > CURRENT_DATE AS is_future",
            [reading_date]
        );

        if (dateCheck.rows[0].is_future) {
            return res.status(400).json({
                message: "Date cannot be in the future."
            });
        }

        // Validate glucose value
        if (!Number.isInteger(glucose_value) ||
            glucose_value < 40 ||
            glucose_value > 600) {
            return res.status(400).json({
                message: "Value must be between 40 and 600 mg/dl."
            });
        }

        // Validate time slot
        if (!allowedSlots.includes(time_slot)) {
            return res.status(400).json({
                message: "Please select a valid time slot."
            });
        }

        // Insert reading
        const result = await pool.query(
            `INSERT INTO readings
            (user_id, reading_date, time_slot, glucose_value)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [userId, reading_date, time_slot, glucose_value]
        );

        return res.status(201).json({
            message: "Glucose reading added successfully!",
            reading: result.rows[0]
        });

    } catch (error) {
        // Duplicate slot for the same date and user
        if (error.code === "23505") {
            return res.status(409).json({
                message: `You already have a ${req.body.time_slot} reading for this date.`
            });
        }

        console.error("Create reading error:", error.message);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// GET ALL READINGS FOR LOGGED-IN USER
const getReadings = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT id, reading_date, time_slot, glucose_value, created_at
             FROM readings
             WHERE user_id = $1
             ORDER BY reading_date DESC, id DESC`,
            [userId]
        );

        return res.status(200).json({
            count: result.rows.length,
            readings: result.rows
        });

    } catch (error) {
        console.error("Get readings error:", error.message);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

// UPDATE READING
const updateReading = async (req, res) => {
    try {
        const { id } = req.params;
        const { reading_date, time_slot, glucose_value } = req.body || {};

        const userId = req.user.userId;

        // Validate required fields
        if (
            !reading_date ||
            !time_slot ||
            glucose_value === undefined ||
            glucose_value === null ||
            glucose_value === ""
        ) {
            return res.status(400).json({
                message: "Date, time slot and glucose value are required."
            });
        }

        // Validate date format
        if (
            typeof reading_date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(reading_date)
        ) {
            return res.status(400).json({
                message: "Please enter a valid date."
            });
        }

        const parsedDate = new Date(`${reading_date}T00:00:00.000Z`);

        if (
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== reading_date
        ) {
            return res.status(400).json({
                message: "Please enter a valid date."
            });
        }

        // Future date validation
        const dateCheck = await pool.query(
            "SELECT $1::date > CURRENT_DATE AS is_future",
            [reading_date]
        );

        if (dateCheck.rows[0].is_future) {
            return res.status(400).json({
                message: "Date cannot be in the future."
            });
        }

        // Glucose value validation
        if (
            !Number.isInteger(glucose_value) ||
            glucose_value < 40 ||
            glucose_value > 600
        ) {
            return res.status(400).json({
                message: "Value must be between 40 and 600 mg/dl."
            });
        }

        // Time slot validation
        if (!allowedSlots.includes(time_slot)) {
            return res.status(400).json({
                message: "Please select a valid time slot."
            });
        }

        // Update only the logged-in user's reading
        const result = await pool.query(
            `UPDATE readings
             SET reading_date = $1,
                 time_slot = $2,
                 glucose_value = $3
             WHERE id = $4 AND user_id = $5
             RETURNING *`,
            [reading_date, time_slot, glucose_value, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Reading not found."
            });
        }

        return res.status(200).json({
            message: "Reading updated successfully!",
            reading: result.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "A reading already exists for this date and time slot."
            });
        }

        console.error("Update reading error:", error.message);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

// DELETE READING
const deleteReading = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const result = await pool.query(
            `DELETE FROM readings
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Reading not found."
            });
        }

        return res.status(200).json({
            message: "Reading deleted successfully!"
        });

    } catch (error) {
        console.error("Delete reading error:", error.message);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

module.exports = {
    createReading,
    getReadings,
    updateReading,
    deleteReading
};