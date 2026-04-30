import express from "express";
import { listEvents, createEvent, deleteEvent } from "../controllers/event.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public list of events (admin UI will call this when authenticated but listing is public)
// We add protect() so we can know who is calling (student vs admin)
// We allow ANY authenticated user ("student", "admin")
router.get("/", protect(["admin", "student"]), listEvents);

// Create event (admin or student)
router.post("/", protect(["admin", "student"]), createEvent);

// Delete event (admin or student)
router.delete("/:id", protect(["admin", "student"]), deleteEvent);

export default router;
