# CampusHire Backend API

Node.js + Express REST API for campus placement management. Connected to MongoDB for data persistence, Cloudinary for media storage, and Nodemailer for email notifications.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Models & Schemas](#models--schemas)
- [Error Handling](#error-handling)
- [File Upload](#file-upload)
- [Email System](#email-system)
- [Development](#development)

## 🏗 Architecture

```
Express App (app.js)
├── Routes (15+ endpoint groups)
├── Controllers (Business logic)
├── Models (Mongoose schemas)
├── Middleware (Auth, upload, error handling)
├── Config (Database, Cloudinary, email)
└── Utils (Helper functions)
```

### Request Flow
```
HTTP Request
    ↓
CORS Middleware
    ↓
Body Parser (JSON)
    ↓
Auth Middleware (protect) [if required]
    ↓
Route Handler
    ↓
Controller Logic
    ↓
MongoDB / Cloudinary
    ↓
JSON Response
```

## 🚀 Getting Started

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create `.env` file in backend directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/campushire

# JWT (Access tokens)
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRE=7d

# Email (Gmail recommended)
EMAIL_SERVICE=Gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_google_app_password

# Cloud Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Run Server

```bash
# Development (with Nodemon auto-reload)
npm run dev

# Production
npm start
```

Server listens on `http://localhost:5000` by default.

## 🔐 Authentication

### JWT Token Flow

1. **User logs in** → `POST /api/auth/login`
2. **Backend validates credentials** → Generates JWT
3. **Token sent in HTTP-only cookie** → Browser auto-attaches to requests
4. **Protected routes** → Middleware verifies token
5. **Expired token** → User prompted to re-login

### Token Structure

```javascript
// Payload
{
  userId: "507f1f77bcf86cd799439011",
  role: "student",
  iat: 1694000000,
  exp: 1694604800
}
```

### Usage in Routes

```javascript
// Protect route for students only
router.get("/profile", protect(["student"]), getProfile);

// Protect route for admins and companies
router.get("/data", protect(["admin", "company"]), getData);

// Public route (no auth required)
router.get("/public-info", getPublicInfo);
```

## 📡 API Endpoints

### Authentication Routes `/api/auth`

#### **POST /signup/student**
Register a new student account.

```javascript
// Request
POST /api/auth/signup/student
Content-Type: application/json

{
  "name": "John Doe",
  "enrollmentNo": "2021CSE001",
  "email": "john@example.com",
  "password": "SecurePass123"
}

// Response (201 Created)
{
  "_id": "507f1f77bcf86cd799439011",
  "message": "Student registered. Check email to verify account."
}
```

#### **POST /login**
Login with email and password.

```javascript
// Request
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}

// Response (200 OK)
{
  "message": "Login successful",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "role": "student",
    "email": "john@example.com"
  }
  // JWT token sent in HTTP-only cookie
}
```

#### **GET /verify-email/:token**
Verify email with token from email link.

```javascript
// Response (200 OK)
{
  "message": "Email verified successfully"
}
```

#### **POST /forgot-password**
Request password reset email.

```javascript
// Request
{
  "email": "john@example.com"
}

// Response (200 OK)
{
  "message": "Password reset link sent to email"
}
```

#### **POST /reset-password/:token**
Reset password using token from email.

```javascript
// Request
{
  "newPassword": "NewSecurePass456"
}

// Response (200 OK)
{
  "message": "Password reset successfully"
}
```

---

### Student Routes `/api/student`

#### **GET /profile**
Get current logged-in student's profile. **Auth: student**

```javascript
// Response (200 OK)
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "enrollmentNo": "2021CSE001",
  "email": "john@example.com",
  "phone": "+91-9876543210",
  "UGcgpa": 8.5,
  "UGpassoutYear": 2024,
  "UGbranch": {
    "_id": "branch_id",
    "name": "Computer Science",
    "code": "CSE"
  },
  "UGinstitute": {
    "_id": "inst_id",
    "name": "Tech University",
    "code": "TU"
  },
  "skills": ["JavaScript", "React", "MongoDB"],
  "isEligible": true,
  "placementStatus": "Placed"
}
```

#### **PUT /profile**
Update student profile. **Auth: student**

```javascript
// Request
{
  "phone": "+91-9876543210",
  "UGcgpa": 8.7,
  "skills": ["JavaScript", "React", "Node.js"]
}

// Response (200 OK)
{
  "message": "Profile updated successfully",
  // Updated student object returned
}
```

#### **POST /resume**
Upload resume file. **Auth: student**

```javascript
// Request (multipart/form-data)
POST /api/student/resume
[file: resume.pdf]

// Response (201 Created)
{
  "message": "Resume uploaded successfully",
  "resumeUrl": "https://res.cloudinary.com/..."
}
```

#### **DELETE /resume**
Delete a resume. **Auth: student**

```javascript
// Request
{
  "resumeUrl": "https://res.cloudinary.com/..."
}

// Response (200 OK)
{
  "message": "Resume deleted successfully"
}
```

#### **GET /ug/institutes**
List all UG institutes. **Auth: student**

```javascript
// Response (200 OK)
[
  {
    "_id": "id1",
    "name": "Tech University",
    "code": "TU"
  },
  {
    "_id": "id2",
    "name": "Engineering College",
    "code": "EC"
  }
]
```

#### **GET /ug/branches**
List all UG branches. **Auth: student**

```javascript
// Response (200 OK)
[
  { "_id": "id1", "name": "Computer Science", "code": "CSE" },
  { "_id": "id2", "name": "Mechanical Engineering", "code": "ME" }
]
```

---

### Drive Routes `/api/drive`

#### **GET /**
List all active placement drives. **Auth: student**

```javascript
// Query Parameters
?search=Google&sort=-createdAt&limit=20

// Response (200 OK)
[
  {
    "_id": "drive_id",
    "title": "Google SDE Internship 2024",
    "company": {
      "_id": "comp_id",
      "name": "Google",
      "logo": "https://..."
    },
    "minCGPA": 7.5,
    "eligibleBranches": ["CSE", "IT"],
    "jobRole": "Software Engineer",
    "salary": { "base": 1200000, "bonus": 300000 },
    "applicationDeadline": "2024-12-31",
    "status": "Open",
    "totalApplications": 145,
    "applied": true  // For authenticated students
  }
]
```

#### **POST /**
Create new placement drive. **Auth: admin**

```javascript
// Request
POST /api/drive
{
  "title": "Google SDE 2024",
  "company": "company_id",
  "minCGPA": 7.5,
  "eligibleBranches": ["CSE"],
  "jobRole": "Software Engineer",
  "salary": { "base": 1200000, "bonus": 300000 },
  "jobDescription": "Build scalable systems...",
  "applicationDeadline": "2024-12-31"
}

// Response (201 Created)
{
  "_id": "drive_id",
  "message": "Drive created successfully"
  // Email notifications sent to eligible students
}
```

#### **GET /:id**
Get drive details by ID. **Auth: public**

```javascript
// Response (200 OK)
{
  "_id": "drive_id",
  "title": "Google SDE 2024",
  "company": { /* company details */ },
  "jobDescription": "Full description...",
  "applicationDeadline": "2024-12-31",
  "totalApplications": 145,
  // ... other fields
}
```

#### **PUT /:id**
Update drive details. **Auth: admin**

```javascript
// Request
{
  "status": "Closed",
  "salary": { "base": 1300000, "bonus": 350000 }
}

// Response (200 OK)
{
  "message": "Drive updated successfully"
}
```

#### **POST /:id/apply**
Apply to a placement drive. **Auth: student**

```javascript
// Request
{
  "resume": "resume_url",
  "coverLetter": "Why I'm interested..."
}

// Response (201 Created)
{
  "_id": "application_id",
  "message": "Application submitted successfully",
  // Confirmation email sent to student
}
```

#### **GET /admin**
List all drives for admin management. **Auth: admin**

```javascript
// Response (200 OK)
[
  {
    "_id": "id1",
    "title": "Google SDE 2024",
    "status": "Open",
    "totalApplications": 145
  }
]
```

---

### Admin Routes `/api/admin`

#### **GET /dashboard-stats**
Get dashboard statistics. **Auth: admin**

```javascript
// Response (200 OK)
{
  "stats": {
    "totalStudents": 1250,
    "placedStudents": 850,
    "activeCompanies": 42,
    "placementRate": "68%",
    "openDrives": 15
  },
  "topRecruiters": [
    { "name": "Google", "count": 45 },
    { "name": "Amazon", "count": 38 }
  ],
  "activeJobs": [
    { "id": "id1", "title": "SDE", "company": "Google" }
  ],
  "trendData": [
    { "month": "Jan", "placements": 50 }
  ],
  "departmentData": [
    { "name": "CSE", "value": 320 }
  ]
}
```

#### **GET /students**
List students with filters. **Auth: admin**

```javascript
// Query Parameters
?q=John&institute=Tech%20University&branch=CSE&published=true&awaiting=false

// Response (200 OK)
[
  {
    "_id": "student_id",
    "name": "John Doe",
    "enrollmentNo": "2021CSE001",
    "email": "john@example.com",
    "UGcgpa": 8.5,
    "placementStatus": "Placed",
    "companyName": "Google",
    "placedPhoto": "https://...",
    "achievementMessage": "Placed at Google as SDE!",
    "isPublished": true
  }
]
```

#### **GET /students/export**
Export students to CSV. **Auth: admin**

```javascript
// Query Parameters
?placed=true&institute=TU&branch=CSE

// Response (200 OK)
// Returns CSV file download
```

#### **GET /students/:id**
Get specific student details. **Auth: admin**

```javascript
// Response (200 OK)
{
  "_id": "student_id",
  "name": "John Doe",
  "email": "john@example.com",
  // All student fields
}
```

#### **PUT /students/:id/achievement**
Publish or update placement achievement. **Auth: admin**

```javascript
// Request (multipart/form-data)
{
  "placedPhoto": [file],           // Optional: file upload
  "achievementMessage": "Placed at Google!",
  "isPublished": true,
  "companyName": "Google"           // Auto-derived if not provided
}

// Response (200 OK)
{
  "message": "Achievement updated successfully",
  "student": { /* updated student */ }
  // Record synced to PlacedStudent collection
}
```

---

### Upload Routes `/api/upload`

#### **POST /**
Upload files to Cloudinary. **Auth: any**

```javascript
// Request (multipart/form-data)
POST /api/upload
[files: file1.pdf, file2.jpg]

// Response (201 Created)
{
  "files": [
    {
      "name": "file1.pdf",
      "url": "https://res.cloudinary.com/...",
      "size": 2048
    }
  ]
}
```

---

### Review Routes `/api/reviews`

#### **POST /**
Post a company review. **Auth: student**

```javascript
// Request
{
  "company": "company_id",
  "rating": 4.5,
  "title": "Great experience!",
  "comments": "Interview process was smooth...",
  "isAnonymous": false
}

// Response (201 Created)
{
  "_id": "review_id",
  "message": "Review posted successfully"
}
```

#### **GET /:companyId**
Get reviews for a company. **Auth: public**

```javascript
// Response (200 OK)
[
  {
    "_id": "review_id",
    "studentName": "John Doe",
    "rating": 4.5,
    "title": "Great experience!",
    "comments": "...",
    "createdAt": "2024-01-15"
  }
]
```

---

### Public Routes `/api/public`

#### **GET /placed-students**
Get published placement achievements (Wall of Fame). **Auth: public**

```javascript
// Response (200 OK)
[
  {
    "_id": "id1",
    "name": "John Doe",
    "enrollmentNo": "2021CSE001",
    "passoutYear": 2024,
    "branchName": "Computer Science",
    "instituteName": "Tech University",
    "companyName": "Google",
    "driveTitle": "SDE 2024",
    "placedPhoto": "https://...",
    "achievementMessage": "Placed at Google!"
  }
]
```

---

## 📊 Models & Schemas

### User
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: "student" | "company" | "admin",
  createdAt: Date
}
```

### Student
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String,
  enrollmentNo: String (unique),
  email: String,
  phone: String,
  
  // Academic Info
  UGcgpa: Number (0-10),
  UGpassoutYear: Number,
  UGbranch: ObjectId (ref: Branch),
  UGinstitute: ObjectId (ref: Institute),
  
  // Placement
  placementStatus: "Placed" | "Not Placed",
  companyName: String,
  isEligible: Boolean,
  
  // Achievement
  placedPhoto: String (URL),
  achievementMessage: String,
  isPublished: Boolean,
  
  skills: [String],
  resumeUrl: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### Drive
```javascript
{
  _id: ObjectId,
  title: String,
  company: ObjectId (ref: Company),
  jobRole: String,
  salary: {
    base: Number,
    bonus: Number
  },
  minCGPA: Number,
  eligibleBranches: [String],
  eligibleInstitutes: [String],
  status: "Open" | "Closed" | "Interviewing",
  applicationDeadline: Date,
  jobDescription: String,
  createdAt: Date
}
```

### Application
```javascript
{
  _id: ObjectId,
  student: ObjectId (ref: Student),
  drive: ObjectId (ref: Drive),
  status: "Applied" | "Offer" | "Selected" | "Hired" | "Rejected",
  resume: String (URL),
  createdAt: Date
}
```

### PlacedStudent
```javascript
{
  _id: ObjectId,
  student: ObjectId (ref: Student),
  name: String,
  enrollmentNo: String,
  passoutYear: Number,
  branchId: ObjectId,
  branchName: String,
  instituteId: ObjectId,
  instituteName: String,
  companyId: ObjectId,
  companyName: String,
  driveTitle: String,
  placedPhoto: String (URL),
  achievementMessage: String,
  isPublished: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## ❌ Error Handling

All errors return standard JSON format:

```javascript
{
  "message": "Error description",
  "status": 400
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid auth |
| 403 | Forbidden - Not permitted for this role |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal error |

### Example Error Response

```javascript
// 401 Unauthorized
{
  "message": "Token invalid or expired. Please login again."
}

// 404 Not Found
{
  "message": "Drive not found"
}
```

## 📤 File Upload

### Supported Features
- **Storage**: Cloudinary cloud storage
- **Types**: Images (JPEG, PNG), PDFs, Documents
- **Max Size**: 2MB per file
- **Folder**: Organized by type (resumes, placements, etc.)

### Upload Endpoints

| Endpoint | File Field | Purpose |
|----------|-----------|---------|
| `POST /api/student/resume` | `resume` | Student resume |
| `POST /api/admin/students/:id/achievement` | `placedPhoto` | Placement achievement photo |
| `POST /api/upload` | `files` | Generic file upload |

### Upload Example

```javascript
// Frontend
const formData = new FormData();
formData.append("resume", fileInput.files[0]);

await api.post("/student/resume", formData, {
  headers: { "Content-Type": "multipart/form-data" }
});

// Response
{
  "message": "Resume uploaded successfully",
  "resumeUrl": "https://res.cloudinary.com/..."
}
```

## 📧 Email System

### Configured Emails

| Trigger | Recipients | Template |
|---------|----------|----------|
| Student signup | Student | Email verification link |
| Drive creation | Eligible students | Drive notification + Google Calendar link |
| Apply to drive | Student | Application confirmation |
| Reset password | Student | Password reset link |

### Email Provider
- **Service**: Gmail (via Nodemailer)
- **Auth**: App Password (2FA enabled)
- **Templates**: HTML formatted in controllers

### Environment Setup
```env
EMAIL_SERVICE=Gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_google_app_password  # Not regular password
```

## 🛠 Development

### Project Structure
```
backend/
├── app.js                 # Express app setup
├── server.js             # Entry point
├── package.json          # Dependencies
├── .env                  # Environment variables
│
├── config/
│   ├── db.js             # MongoDB connection
│   ├── cloudinary.js     # Cloudinary setup
│   └── mail.js           # Email config (reference)
│
├── controllers/          # Request handlers
│   ├── auth.controller.js
│   ├── student.controller.js
│   ├── drive.controller.js
│   ├── admin.controller.js
│   └── ... (others)
│
├── models/               # MongoDB schemas
│   ├── User.model.js
│   ├── Student.model.js
│   ├── Drive.js
│   ├── Application.js
│   └── ... (others)
│
├── routes/               # API endpoints
│   ├── auth.routes.js
│   ├── student.routes.js
│   ├── drive.routes.js
│   ├── admin.routes.js
│   └── ... (others)
│
├── middleware/           # Custom middleware
│   ├── auth.middleware.js    # JWT verification
│   └── upload.middleware.js  # Multer file handling
│
└── utils/                # Helper functions
    ├── generateToken.js  # JWT creation
    └── sendEmail.js      # Email sending
```

### Development Workflow

1. **Start server**
   ```bash
   npm run dev
   ```

2. **Test endpoints** with Postman or curl
   ```bash
   curl -X GET http://localhost:5000/api/drive \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Check logs** in terminal
   ```
   GET /api/drive 200 - 45ms
   ```

4. **Restart on errors**
   Nodemon auto-restarts on file changes

### Adding New Route

1. Create controller in `controllers/newmodule.controller.js`
2. Create route in `routes/newmodule.routes.js`
3. Mount in `app.js`:
   ```javascript
   import newRoutes from "./routes/newmodule.routes.js";
   app.use("/api/newmodule", newRoutes);
   ```

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Cannot connect to MongoDB | Check `MONGO_URI` and network access |
| 401 Unauthorized on protected routes | Verify JWT token in cookies/headers |
| File upload fails | Verify Cloudinary credentials |
| Emails not sending | Check `EMAIL_*` env vars and 2FA |

## 📚 Additional Resources

- [Express.js Docs](https://expressjs.com)
- [Mongoose Documentation](https://mongoosejs.com)
- [Cloudinary Upload API](https://cloudinary.com/documentation/upload_api)
- [Nodemailer Guide](https://nodemailer.com)

---

**Backend API for CampusHire**

---

# 🗃️ Comprehensive Database Schema Directory
The system revolves around these central MongoDB schemas/tables:

1. **User (`User.model.js`)**: Handles core authentication and identity (Admin, Student, Company HR).
2. **Student (`Student.model.js`)**: In-depth academic record, backlog tracking, percentages, institute info, and resume tracking.
3. **Company (`Company.js`)**: Base company records containing info, branding, and aggregated placement stats.
4. **Drive (`Drive.js`)**: The main abstraction for job postings. Tracks requirements, packages, selection processes, deadlines, HR share links, and eligible students.
5. **Application (`Application.js`)**: Connects Students to Drives. Encompasses immutable snapshot data (`studentSnapshot`) at the exact time of application to preserve academic values historically.
6. **PlacedStudent (`PlacedStudents.js`)**: Logs successful drive offers/placements to showcase achievements.
7. **Institute / Branch (`institute.js`, `branch.js`)**: Master schemas for universities/colleges and respective degree tracking fields (CSE, IT, ECE...).
8. **Event (`Event.js`)**: Manages non-drive external physical or virtual events tracking registrations and RSVPs.
9. **Review (`Review.js`)**: Stores student feedback & experiences about company interviews and selection processes.
10. **PracticeTest / Question (`PracticeTest.js`, `Question.js`)**: Handles the repository and quizzes for coding/aptitude preparation.
11. **MockRound / MockAttempt (`MockRound.model.js`, `MockAttempt.model.js`)**: Manages AI-powered mock interview test phases, recording student attempts and auto-evaluating correctness.

# 🌐 Comprehensive API Route Directory
The Express backend router delegates requests to these modules:

### 1. Auth (`/api/auth`)
- `POST /signup/student`: Create student accounts
- `POST /login`: Authenticates & sends JWT token
- `GET /verify-email/:token`, `POST /forgot-password`, `POST /reset-password/:token`: Security/Account Recovery operations

### 2. Student (`/api/student`)
- `GET /profile`, `PUT /profile`: Retrieves and updates the mutable student profile
- `POST /resume`, `DELETE /resume`: Cloudinary file upload utility mappings for resumes
- `GET /ug/institutes`, `/ug/branches`: Utility data loading for profile selects

### 3. Drive (`/api/drive`)
- `GET /`: Loads active job drives (augmented with applied logic dynamically via JWT for students)
- `POST /`: Admin payload to push a new hiring opportunity
- `GET //:id`: Retrieve single drive metrics
- `GET /admin`: Dashboard analytics drive fetcher
- `POST /:id/apply`: Core function for students to attach snapshot profiles to an application queue

### 4. Admin (`/api/admin`)
- `GET /dashboard-stats`: Returns holistic app data sums (active companies, total placed vs unplaced vs offered)
- `GET /students`, `GET /students/export`: Drives the admin tabular tracking and Excel exports
- `PUT /students/:id/achievement`: Approves placement logs into the public showcase

### 5. Application (`/api/applications`)
- `GET /` & `GET /my`: Retrieve applicant rosters vs student's tracked applications
- `PUT /:id/status`: Updates an application state (Applied -> Shortlist -> Offer)
- `DELETE /:id/withdraw`: Voluntarily rescind application

### 6. Company (`/api/companies`)
- `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`: Full operational CRUD to manage the company base DB instances

### 7. Public (`/api/public`)
- `GET /placement-achievements`: Pulls the wall-of-fame feed dynamically
- `GET /companies`: Non-authenticated company exploration list
- `GET /reviews`: Publicly verified company testimonials
- `POST /hr-share/:id`, `PUT /hr-share/application/:appId`: Public secured endpoints letting 3rd Party HR operate drive dashboards with a passcode instead of a system account

### 8. Events (`/api/events`)
- `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`: Full operational admin CRUD on events and seminars

### 9. Reviews (`/api/reviews`)
- `POST /`: Submit independent review for approval
- `GET /:companyId`: Get distinct company feedbacks
- `PUT /:id/status`: Admin standard verification before posting to public visibility

### 10. Institute & Branch (`/api/institutes`, `/api/branches`)
- Standard list fetches and administrative CRUD for master entity lookup strings.

### 11. Mock Interview (`/api/mock-rounds`, `/api/ai-mock`)
- `GET /mock-rounds`, `POST /mock-rounds`: Administrative test setups 
- `POST /ai-mock/:roundId/start`: Provisions a test attempt mapped to MockAttempt
