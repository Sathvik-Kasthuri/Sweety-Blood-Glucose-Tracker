
const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {createReading,getReadings,updateReading,deleteReading} = require("../controllers/readingController");

// All reading routes require authentication
router.use(authMiddleware);

router.post("/",createReading);

router.get("/",getReadings);

router.put("/:id",updateReading);

router.delete("/:id",deleteReading);

module.exports = router;
