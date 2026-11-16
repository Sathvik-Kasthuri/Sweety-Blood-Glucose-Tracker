const pool = require("./config/db");
const bcrypt = require("bcrypt");

const seedDatabase = async () => {
  try {
    console.log("Starting database seeding...");

    const name = "Demo Patient";
    const email = "demo@sweety.com";
    const password = "SweetyDemo@123";

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create demo user if not already present
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             ON CONFLICT (email)
             DO UPDATE SET
             name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash
             RETURNING id`,
      [name, email, hashedPassword],
    );

    const userId = userResult.rows[0].id;

    // Sample readings
    const sampleReadings = [
      [0, "Morning", 110],
      [0, "After breakfast", 135],
      [0, "After lunch", 145],
      [0, "After dinner", 125],
      [1, "Morning", 115],
      [1, "After breakfast", 140],
      [2, "Morning", 108],
    ];

    for (const [daysAgo, slot, value] of sampleReadings) {
      await pool.query(
        `INSERT INTO readings
                 (user_id, reading_date, time_slot, glucose_value)
                 VALUES ($1, CURRENT_DATE - $2::integer, $3, $4)
                 ON CONFLICT (user_id, reading_date, time_slot)
                 DO UPDATE SET glucose_value = EXCLUDED.glucose_value`,
        [userId, daysAgo, slot, value],
      );
    }

    console.log("Demo user and sample readings created!");
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (error) {
    console.error("Seeding error:", error.message);
  } finally {
    await pool.end();
  }
};

seedDatabase();
