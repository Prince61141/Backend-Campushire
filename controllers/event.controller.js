import Event from "../models/Event.js";
import Company from "../models/Company.js";
import User from "../models/User.model.js";

export const listEvents = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select('_id').lean();
    const adminIds = admins.map(a => a._id);

    let query = {};
    if (req.user?.role === "admin") {
       // Admins see ONLY globally created schedules (created by any admin)
       query = {
         $or: [
           { createdBy: null },
           { createdBy: { $exists: false } },
           { createdBy: { $in: adminIds } }
         ]
       };
    } else {
       // Students see globally created schedules + their own personal items
       query = {
         $or: [
           { createdBy: null },
           { createdBy: { $exists: false } },
           { createdBy: { $in: adminIds } },
           { createdBy: req.user?.id }
         ]
       };
    }

    const events = await Event.find(query)
      .sort({ datetime: 1 })
      .populate("company", "name logo logoUrl image")
      .lean();
    return res.json(events);
  } catch (err) {
    console.error("GET /events error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createEvent = async (req, res) => {
  try {
    const { title, datetime, company } = req.body || {};
    if (!title || !datetime) return res.status(400).json({ message: "Title and datetime are required" });

    const ev = await Event.create({ 
      title: title.trim(), 
      datetime: new Date(datetime), 
      company: company || null, 
      createdBy: req.user?.id 
    });
    const populated = await Event.findById(ev._id).populate("company", "name logo logoUrl image").lean();
    return res.status(201).json(populated);
  } catch (err) {
    console.error("POST /events error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    // Enforce ownership: Admin can delete anything, student can only delete their own
    if (req.user?.role !== "admin" && String(ev.createdBy) !== String(req.user?.id)) {
       return res.status(403).json({ message: "Not authorized to delete this event" });
    }

    await ev.deleteOne();
    return res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("DELETE /events/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export default { listEvents, createEvent, deleteEvent };
