import Drive from "../models/Drive.js";
import Application from "../models/Application.js";
import Student from "../models/Student.model.js";
import Company from "../models/Company.js";
import cloudinary from "../config/cloudinary.js";
import { sendEmail } from "../utils/sendEmail.js";

// Helper function to generate Google Calendar link
const generateGoogleCalendarLink = (title, deadline, description, driveId) => {
  const deadlineDate = new Date(deadline);
  // Format dates for Google Calendar (YYYYMMDDTHHmmssZ format)
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  // Set reminder for the deadline day (all day event)
  const startDate = formatDate(deadlineDate);
  // End date is same as start for deadline reminder
  const endDate = startDate;

  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Apply: ${title} - Application Deadline`,
    dates: `${startDate}/${endDate}`,
    details: description,
    sf: "true",
  });

  return `${baseUrl}?${params.toString()}`;
};

// Function to send email notifications to eligible students
const sendDriveNotificationToEligibleStudents = async (drive, companyName) => {
  try {
    // Build query to find eligible students
    const query = {};

    // Filter by institute if specified
    if (drive.eligibility?.institute?.length > 0) {
      query.UGinstitute = { $in: drive.eligibility.institute };
    }

    // Filter by branch if specified
    if (drive.eligibility?.branches?.length > 0) {
      query.UGbranch = { $in: drive.eligibility.branches };
    }

    // Filter by passout year if specified
    if (drive.eligibility?.passoutYear?.length > 0) {
      const years = drive.eligibility.passoutYear.map((y) =>
        typeof y === "string" ? parseInt(y, 10) : y,
      );
      query.UGpassoutYear = { $in: years };
    }

    // Filter by minimum CGPA
    if (drive.eligibility?.minCGPA) {
      query.UGcgpa = { $gte: drive.eligibility.minCGPA };
    }

    // Filter by active backlogs
    if (!drive.eligibility?.allowActiveBacklogs) {
      query.UGActiveBacklog = { $eq: 0 };
    }

    // Filter by max total backlogs
    if (drive.eligibility?.maxTotalBacklogs !== undefined) {
      query.UGTotalBacklog = { $lte: drive.eligibility.maxTotalBacklogs };
    }

    // Filter placed students
    if (!drive.eligibility?.allowPlacedStudents) {
      query.placementStatus = { $ne: "Placed" };
    }

    // Only eligible students
    query.isEligible = true;

    // Find eligible students
    const eligibleStudents = await Student.find(query)
      .select("email name")
      .lean();

    if (eligibleStudents.length === 0) {
      console.log("No eligible students found for drive:", drive.title);
      return;
    }

    console.log(
      `Sending notifications to ${eligibleStudents.length} eligible students for drive: ${drive.title}`,
    );

    // Format deadline for display
    const deadlineDate = new Date(drive.applicationDeadline);
    const formattedDeadline = deadlineDate.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Generate Google Calendar link
    const calendarDescription = `Application deadline for ${drive.title} at ${companyName}.\n\nRoles: ${drive.roles?.map((r) => r.roleName).join(", ") || "N/A"}\nPackage: ${drive.package || "Not disclosed"}\nLocation: ${drive.location || "Not specified"}\n\nDon't miss this opportunity!`;
    const calendarLink = generateGoogleCalendarLink(
      `${companyName} - ${drive.title}`,
      drive.applicationDeadline,
      calendarDescription,
      drive._id,
    );

    // Send emails in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < eligibleStudents.length; i += batchSize) {
      const batch = eligibleStudents.slice(i, i + batchSize);

      const emailPromises = batch.map((student) => {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Placement Drive</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎯 New Placement Drive!</h1>
                        <p style="color: #e0e0e0; margin: 10px 0 0 0; font-size: 16px;">A new opportunity awaits you</p>
                      </td>
                    </tr>
                    
                    <!-- Greeting -->
                    <tr>
                      <td style="padding: 30px 30px 20px;">
                        <p style="color: #333; font-size: 16px; margin: 0;">Dear <strong>${student.name}</strong>,</p>
                        <p style="color: #555; font-size: 15px; margin-top: 15px; line-height: 1.6;">
                          Great news! A new placement drive has been announced at <strong>CampusHire</strong> and you are eligible to apply!
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Drive Details Card -->
                    <tr>
                      <td style="padding: 0 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9ff; border-radius: 8px; border: 1px solid #e0e4ff;">
                          <tr>
                            <td style="padding: 25px;">
                              <h2 style="color: #667eea; margin: 0 0 15px 0; font-size: 22px;">${companyName}</h2>
                              <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px;">${drive.title}</h3>
                              
                              <table width="100%" cellpadding="8" cellspacing="0">
                                <tr>
                                  <td style="color: #666; font-size: 14px; width: 40%;">📋 <strong>Roles:</strong></td>
                                  <td style="color: #333; font-size: 14px;">${drive.roles?.map((r) => r.roleName).join(", ") || "To be announced"}</td>
                                </tr>
                                <tr>
                                  <td style="color: #666; font-size: 14px;">💼 <strong>Job Type:</strong></td>
                                  <td style="color: #333; font-size: 14px;">${drive.jobType || "N/A"}</td>
                                </tr>
                                <tr>
                                  <td style="color: #666; font-size: 14px;">💰 <strong>Package:</strong></td>
                                  <td style="color: #333; font-size: 14px;">${drive.package || "Not disclosed"}</td>
                                </tr>
                                <tr>
                                  <td style="color: #666; font-size: 14px;">📍 <strong>Location:</strong></td>
                                  <td style="color: #333; font-size: 14px;">${drive.location || "Not specified"}</td>
                                </tr>
                                <tr>
                                  <td style="color: #666; font-size: 14px;">🏢 <strong>Work Mode:</strong></td>
                                  <td style="color: #333; font-size: 14px;">${drive.workMode || "Not specified"}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Deadline Alert -->
                    <tr>
                      <td style="padding: 25px 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3e0; border-radius: 8px; border-left: 4px solid #ff9800;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="color: #e65100; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">⏰ Application Deadline</p>
                              <p style="color: #333; margin: 10px 0 0 0; font-size: 20px; font-weight: bold;">${formattedDeadline}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- CTA Buttons -->
                    <tr>
                      <td style="padding: 0 30px 30px;" align="center">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-right: 10px;">
                              <a href="${calendarLink}" target="_blank" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                📅 Add to Google Calendar
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="color: #666; font-size: 13px; margin-top: 15px;">
                          Click the button above to add this deadline to your calendar and never miss it!
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Tips Section -->
                    <tr>
                      <td style="padding: 0 30px 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f5e9; border-radius: 8px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="color: #2e7d32; margin: 0 0 10px 0; font-size: 15px; font-weight: 600;">💡 Quick Tips:</p>
                              <ul style="color: #555; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li>Update your resume before applying</li>
                                <li>Review the job requirements carefully</li>
                                <li>Practice mock tests to prepare</li>
                              </ul>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #eee;">
                        <p style="color: #888; font-size: 13px; margin: 0;">
                          You're receiving this email because you're registered on CampusHire.<br>
                          <small>© ${new Date().getFullYear()} CampusHire. All rights reserved.</small>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        return sendEmail({
          email: student.email,
          subject: `🚀 New Drive: ${companyName} - ${drive.title} | Apply Now!`,
          html: emailHtml,
        }).catch((err) => {
          console.error(
            `Failed to send email to ${student.email}:`,
            err.message,
          );
        });
      });

      await Promise.all(emailPromises);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < eligibleStudents.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`Successfully sent notifications for drive: ${drive.title}`);
  } catch (error) {
    console.error("Error sending drive notifications:", error);
  }
};

export const createDrive = async (req, res) => {
  try {
    const data = req.body || {};
    // normalize skills
    if (data.skills && !Array.isArray(data.skills)) {
      data.skills = data.skills ? [data.skills] : [];
    }

    // map rounds at root to selectionProcess.rounds if provided
    if (Array.isArray(data.rounds)) {
      data.selectionProcess = data.selectionProcess || {};
      data.selectionProcess.rounds = data.rounds.map((r) => ({
        roundName: r.roundName || r.title || r.roundTitle || r.name || "",
        roundDate: r.roundDate || r.expectedDate || r.date || null,
        roundTime: r.roundTime || r.expectedTime || r.time || "",
      }));
      delete data.rounds;
    }

    // normalize arrays
    if (data.roles && !Array.isArray(data.roles)) {
      data.roles = Array.isArray(data.roles) ? data.roles : [];
    }
    if (data.eligibility) {
      data.eligibility.institute = Array.isArray(data.eligibility.institute)
        ? data.eligibility.institute
        : data.eligibility.institute
          ? [data.eligibility.institute]
          : [];
      data.eligibility.branches = Array.isArray(data.eligibility.branches)
        ? data.eligibility.branches
        : data.eligibility.branches
          ? [data.eligibility.branches]
          : [];
      data.eligibility.passoutYear = Array.isArray(data.eligibility.passoutYear)
        ? data.eligibility.passoutYear
        : data.eligibility.passoutYear
          ? [data.eligibility.passoutYear]
          : [];
    }

    if (data.applicationDeadline) {
      const deadline = new Date(data.applicationDeadline);

      // Check if frontend provided only date (no time)
      if (!data.applicationDeadline.includes("T")) {
        // Default time to 23:59
        deadline.setHours(23, 59, 0, 0); // hours, minutes, seconds, milliseconds
      }

      data.applicationDeadline = deadline;
    }

    const drive = await Drive.create(data);

    // Send email notifications to eligible students (non-blocking)
    // Fetch company name for the email
    Company.findById(drive.company)
      .select("name")
      .lean()
      .then((company) => {
        const companyName = company?.name || "Company";
        sendDriveNotificationToEligibleStudents(drive, companyName);
      })
      .catch((err) => {
        console.error("Failed to fetch company for notification:", err);
      });

    res.status(201).json({ message: "Drive created", drive });
  } catch (err) {
    console.error("POST /drive error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDriveById = async (req, res) => {
  try {
    const { id } = req.params;
    const drive = await Drive.findById(id).lean();
    if (!drive) return res.status(404).json({ message: "Drive not found" });
    return res.json(drive);
  } catch (err) {
    console.error("GET /drive/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const listDrivesForAdmin = async (req, res) => {
  try {
    // populate company to include name/logo for admin listing
    const drives = await Drive.find()
      .sort({ createdAt: -1 })
      .populate("company", "name logo logoUrl image")
      .lean();
    return res.json(drives);
  } catch (err) {
    console.error("GET /drive/admin error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};
    // normalize skills
    if (data.skills && !Array.isArray(data.skills)) {
      data.skills = data.skills ? [data.skills] : [];
    }

    // map rounds at root to selectionProcess.rounds if provided
    if (Array.isArray(data.rounds)) {
      data.selectionProcess = data.selectionProcess || {};
      data.selectionProcess.rounds = data.rounds.map((r) => ({
        roundName: r.roundName || r.title || r.roundTitle || r.name || "",
        roundDate: r.roundDate || r.expectedDate || r.date || null,
        roundTime: r.roundTime || r.expectedTime || r.time || "",
      }));
      delete data.rounds;
    }

    // normalize arrays similar to create
    if (data.roles && !Array.isArray(data.roles)) {
      data.roles = Array.isArray(data.roles) ? data.roles : [];
    }
    if (data.eligibility) {
      data.eligibility.institute = Array.isArray(data.eligibility.institute)
        ? data.eligibility.institute
        : data.eligibility.institute
          ? [data.eligibility.institute]
          : [];
      data.eligibility.branches = Array.isArray(data.eligibility.branches)
        ? data.eligibility.branches
        : data.eligibility.branches
          ? [data.eligibility.branches]
          : [];
      data.eligibility.passoutYear = Array.isArray(data.eligibility.passoutYear)
        ? data.eligibility.passoutYear
        : data.eligibility.passoutYear
          ? [data.eligibility.passoutYear]
          : [];
    }

    if (data.applicationDeadline) {
      const deadline = new Date(data.applicationDeadline);
      if (!data.applicationDeadline.includes("T")) {
        deadline.setHours(23, 59, 0, 0);
      }
      data.applicationDeadline = deadline;
    }

    // Fetch existing drive to determine if any stored documents were removed
    const existing = await Drive.findById(id).lean();
    if (!existing) return res.status(404).json({ message: "Drive not found" });

    // Determine public_ids present previously and in incoming payload
    const existingPublicIds = (existing.documents || [])
      .map((d) => d.public_id)
      .filter(Boolean);
    const incomingPublicIds = (data.documents || [])
      .map((d) => d.public_id)
      .filter(Boolean);

    // Any existing public_id not present in incomingPublicIds should be removed from Cloudinary
    const toDelete = existingPublicIds.filter(
      (pid) => !incomingPublicIds.includes(pid),
    );
    for (const pid of toDelete) {
      try {
        await cloudinary.uploader.destroy(pid);
      } catch (e) {
        // log and continue
        console.warn(
          "Failed to delete cloudinary resource",
          pid,
          e.message || e,
        );
      }
    }

    const drive = await Drive.findByIdAndUpdate(id, data, { new: true }).lean();
    return res.json({ message: "Drive updated", drive });
  } catch (err) {
    console.error("PUT /drive/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const listDrives = async (req, res) => {
  try {
    const drives = await Drive.find({ isActive: true })
      .sort({ applicationDeadline: 1 })
      .lean();

    // If student authenticated, mark applied
    let appliedMap = {};
    if (req.user?.role === "student") {
      const student = await Student.findOne({ userId: req.user.id }).select(
        "_id",
      );
      if (student) {
        const apps = await Application.find({ student: student._id })
          .select("drive")
          .lean();
        appliedMap = Object.fromEntries(
          apps.map((a) => [String(a.drive), true]),
        );
      }
    }

    const result = drives.map((d) => ({
      _id: d._id,
      title: d.title,
      company: d.company,
      roles: d.roles,
      jobType: d.jobType,
      location: d.location,
      package: d.package,
      workMode: d.workMode,
      eligibility: d.eligibility,
      applicationDeadline: d.applicationDeadline,
      expectedDriveDate: d.expectedDriveDate,
      status: d.status,
      isActive: d.isActive,
      applied: appliedMap[String(d._id)] || false,
    }));

    res.json(result);
  } catch (err) {
    console.error("GET /drive error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const applyToDrive = async (req, res) => {
  try {
    const driveId = req.params.id;
    const drive = await Drive.findById(driveId)
      .select(
        "_id isActive title roles allowMultipleRoles company package location workMode jobType applicationDeadline",
      )
      .populate("company", "name")
      .lean();
    if (!drive || !drive.isActive) {
      return res.status(404).json({ message: "Drive not found or inactive" });
    }

    const student = await Student.findOne({ userId: req.user.id }).select(
      "_id name email resumeUrl UGcgpa UGActiveBacklog UGTotalBacklog SSCPercentage optionafterSSC DiplomaPercentage HSCPercentage masters.PGcgpa masters.PGActiveBacklog masters.PGTotalBacklog masters.hasMasters",
    );
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Normalize requested roles from body (optional)
    const requested = req.body?.roles;
    let rolesPayload = [];
    if (Array.isArray(requested)) {
      rolesPayload = requested
        .map((r) =>
          typeof r === "string" ? { roleName: r } : { roleName: r?.roleName },
        )
        .filter((r) => r && r.roleName);
    } else if (typeof requested === "string") {
      rolesPayload = [{ roleName: requested }];
    }

    // Validate against drive's available roles (if any)
    const allowedRoleNames = (drive.roles || [])
      .map((r) => (typeof r === "string" ? r : r?.roleName))
      .filter(Boolean);

    if (allowedRoleNames.length > 0) {
      if (rolesPayload.length > 0) {
        rolesPayload = rolesPayload.filter((r) =>
          allowedRoleNames.includes(r.roleName),
        );
      }

      // Enforce explicit size constraints governed by Drive settings
      if (drive.allowMultipleRoles) {
        if (rolesPayload.length > 2) rolesPayload = rolesPayload.slice(0, 2);
      } else {
        if (rolesPayload.length > 1) rolesPayload = rolesPayload.slice(0, 1);
      }

      // Default to first role if none provided or invalid
      if (rolesPayload.length === 0) {
        rolesPayload = [{ roleName: allowedRoleNames[0] }];
      }
    }

    // Attempt to create application; unique index prevents duplicates
    try {
      const selectedResume =
        req.body?.resumeUrl ||
        (student.resumeUrl && student.resumeUrl.length > 0
          ? student.resumeUrl[0]
          : "");
      await Application.create({
        drive: drive._id,
        student: student._id,
        roles: rolesPayload,
        studentSnapshot: {
          resumeUrl: selectedResume,
          sscPercentage: student?.SSCPercentage ?? 0,
          hscPercentage: student?.HSCPercentage ?? (student?.DiplomaPercentage ?? 0),
          optionAfter10th: student?.optionafterSSC || "",
          degreeType: student?.masters?.hasMasters ? "PG" : "UG",
          cgpa: student?.masters?.hasMasters
            ? (student?.masters?.PGcgpa ?? 0)
            : (student?.UGcgpa ?? 0),

          activeBacklogs: student?.masters?.hasMasters
            ? (student?.masters?.PGActiveBacklog ?? 0)
            : (student?.UGActiveBacklog ?? 0),

          totalBacklogs: student?.masters?.hasMasters
            ? (student?.masters?.PGTotalBacklog ?? 0)
            : (student?.UGTotalBacklog ?? 0),
        },
      });

      // Send confirmation email to student (non-blocking)
      const companyName = drive.company?.name || "Company";
      const driveTitle = drive.title || "";
      const appliedRoles =
        rolesPayload.map((r) => r.roleName).join(", ") || "N/A";

      // Snapshot values used at apply time
      const usedCgpa = student?.masters?.hasMasters
        ? (student?.masters?.PGcgpa ?? 0)
        : (student?.UGcgpa ?? 0);

      const usedActiveBacklogs = student?.masters?.hasMasters
        ? (student?.masters?.PGActiveBacklog ?? 0)
        : (student?.UGActiveBacklog ?? 0);

      const usedTotalBacklogs = student?.masters?.hasMasters
        ? (student?.masters?.PGTotalBacklog ?? 0)
        : (student?.UGTotalBacklog ?? 0);

      const applicationEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Application Confirmation - ${driveTitle}</title>
</head>
<body style="margin:0;padding:0;font-family:Segoe UI,Arial,sans-serif;background:#f4f6f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">
        <table width="550" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:30px;">
          
          <tr>
            <td style="text-align:center;">
              <h2 style="color:#4CAF50;margin-bottom:10px;">
                ✅ You Successfully Applied for the Drive
              </h2>
              <p style="color:#333;font-size:15px;">
                All the Best! Prepare Well.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-top:20px;">
              <hr style="border:none;border-top:1px solid #eee;">
            </td>
          </tr>

          <tr>
            <td style="padding-top:15px;">
              <p style="font-size:15px;color:#555;margin:6px 0;">
                <strong>Company:</strong> ${companyName}
              </p>
              <p style="font-size:15px;color:#555;margin:6px 0;">
                <strong>Role:</strong> ${appliedRoles}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-top:20px;">
              <h3 style="margin-bottom:10px;color:#333;">📄 Academic & Resume Details Used</h3>
              <p style="font-size:14px;color:#555;margin:6px 0;">
                <strong>CGPA:</strong> ${usedCgpa}
              </p>
              <p style="font-size:14px;color:#555;margin:6px 0;">
                <strong>Active Backlogs:</strong> ${usedActiveBacklogs}
              </p>
              <p style="font-size:14px;color:#555;margin:6px 0;">
                <strong>Total Backlogs:</strong> ${usedTotalBacklogs}
              </p>
              <p style="font-size:14px;color:#555;margin:6px 0;word-break:break-all;">
                <strong>Resume URL:</strong> 
                <a href="${selectedResume}" target="_blank">${selectedResume}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      // Send email non-blocking
      sendEmail({
        email: student.email,
        subject: `✅ Application Confirmed: ${companyName} - ${drive.title}`,
        html: applicationEmailHtml,
      }).catch((err) => {
        console.error(
          `Failed to send application confirmation to ${student.email}:`,
          err.message,
        );
      });

      return res.status(201).json({ message: "Applied successfully" });
    } catch (e) {
      if (e.code === 11000) {
        return res.status(400).json({ message: "Already applied" });
      }
      console.error("Apply error", e);
      return res.status(500).json({ message: "Server error" });
    }
  } catch (err) {
    console.error("POST /drive/:id/apply error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export default { createDrive, listDrives, applyToDrive };
