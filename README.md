
# Course-Pilot Backend API

This is the backend API for Course-Pilot, a personalized learning platform with AI-powered interview assessments. The backend provides authentication, user management, course generation, progress tracking, and AI-driven interview functionality using Firebase Admin SDK.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Authentication Architecture](#authentication-architecture)
4. [API Endpoints](#api-endpoints)
5. [Setup Instructions](#setup-instructions)
6. [Environment Variables](#environment-variables)
7. [Deployment](#deployment)

## Overview

The Course-Pilot backend is built with Express.js and Firebase Admin SDK, providing a comprehensive learning management system with:
- **Secure Authentication**: Session-based authentication with Firebase Admin SDK
- **Course Generation**: AI-powered personalized course creation
- **Progress Tracking**: Detailed learning progress monitoring
- **Interview System**: AI-conducted interviews with feedback generation
- **Resource Management**: Integration with external learning resources

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: Firebase Admin SDK
- **Database**: Firebase Firestore
- **Session Management**: HTTP-only cookies
- **AI Integration**: Google Gemini for course generation
- **Middleware**: Custom authentication middleware
- **Error Handling**: Centralized error handling with custom AppError class

## Authentication Architecture

### Session Flow

```
1. User Registration
   ├── Create Firebase Auth user
   ├── Store user data in Firestore
   └── Return user information

2. User Login
   ├── Verify Firebase ID token
   ├── Create session cookie (2 days)
   ├── Set HTTP-only cookie
   └── Return user data with expiration

3. Session Refresh
   ├── Verify existing session
   ├── Create new session cookie
   ├── Update cookie expiration
   └── Return new expiration time

4. Protected Routes
   ├── Extract session cookie
   ├── Verify session validity
   ├── Attach user to request
   └── Continue to route handler

5. Logout
   ├── Clear session cookie
   └── Return success response
```

### Security Features

- **HTTP-only Cookies**: Session cookies are not accessible via JavaScript
- **Secure Cookies**: HTTPS-only cookies in production
- **SameSite Protection**: CSRF protection with Lax policy
- **Session Expiration**: 2-day session duration with automatic cleanup
- **Token Verification**: Firebase Admin SDK verification for all protected routes

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/auth/signup`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uid": "firebase_user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST `/auth/login`
Authenticate user and create session.

**Request Body:**
```json
{
  "idToken": "firebase_id_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uid": "firebase_user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "expiresAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET `/auth/me` 🔒
Get current authenticated user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "uid": "firebase_user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "expiresAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### POST `/auth/refresh` 🔒
Refresh user session with new expiration.

**Request Body:**
```json
{
  "idToken": "fresh_firebase_id_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expiresAt": "2024-01-17T10:30:00.000Z"
  }
}
```

#### POST `/auth/logout`
Clear user session and logout.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Resource Routes (`/api/resources`)

#### GET `/resources/search`
Search for learning resources across multiple platforms.

**Query Parameters:**
- `query` (required): Search term

**Response:**
```json
{
  "status": "success",
  "results": 15,
  "data": {
    "videos": [...],
    "blogs": [...],
    "docs": [...]
  }
}
```

#### POST `/resources/generate`
Generate a personalized course using AI.

**Request Body:**
```json
{
  "targetRole": "Full Stack Developer",
  "techStack": ["React", "Node.js", "MongoDB"],
  "experience": "intermediate"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "courseId": "generated_course_id",
    "title": "Full Stack Development Path",
    "modules": [...],
    "estimatedDuration": "12 weeks"
  }
}
```

#### GET `/resources/courses` 🔒
Get courses created by the authenticated user.

**Headers:**
- `userId`: User identifier

**Response:**
```json
{
  "status": "success",
  "results": 3,
  "data": [
    {
      "id": "course_id",
      "title": "Course Title",
      "progress": 45,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Course Routes (`/api/course`)

#### GET `/course/all-courses`
Get all available courses in the platform.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "course_id",
      "title": "Course Title",
      "description": "Course description",
      "creator": "User Name",
      "tags": ["React", "JavaScript"]
    }
  ]
}
```

#### GET `/course/my-courses` 🔒
Get courses belonging to the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "course_id",
      "title": "My Course",
      "progress": 60,
      "modules": [...]
    }
  ]
}
```

#### GET `/course/:courseId`
Get detailed information about a specific course.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "course_id",
    "title": "Course Title",
    "description": "Detailed description",
    "modules": [...],
    "totalLessons": 25,
    "estimatedDuration": "8 weeks"
  }
}
```

### Progress Routes (`/api/progress`)

#### GET `/progress/courses` 🔒
Get progress for all user courses.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "courseId": "course_id",
      "completedLessons": 15,
      "totalLessons": 25,
      "progressPercentage": 60,
      "lastAccessed": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET `/progress/courses/:courseId` 🔒
Get detailed progress for a specific course.

**Response:**
```json
{
  "success": true,
  "data": {
    "courseId": "course_id",
    "completedLessons": ["lesson1", "lesson2"],
    "currentLesson": "lesson3",
    "progressPercentage": 40,
    "timeSpent": 1200
  }
}
```

#### POST `/progress/courses/:courseId/lessons/:lessonId` 🔒
Update progress for a specific lesson.

**Response:**
```json
{
  "success": true,
  "data": {
    "lessonCompleted": true,
    "newProgressPercentage": 45,
    "nextLesson": "lesson4"
  }
}
```

### Interview Routes (`/api/interviews`)

#### POST `/interviews/generate` 🔒
Generate or resume an interview for a course.

**Request Body:**
```json
{
  "courseId": "course_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "interview_id",
    "courseId": "course_id",
    "questions": ["Question 1", "Question 2"],
    "status": "pending",
    "attemptCount": 1
  }
}
```

#### GET `/interviews/status/:courseId` 🔒
Get interview status for a specific course.

**Response:**
```json
{
  "exists": true,
  "status": "completed",
  "feedbackId": "feedback_id",
  "score": 85,
  "canRetake": false,
  "retakeAvailableDate": "2024-01-22T10:30:00.000Z"
}
```

#### GET `/interviews/user` 🔒
Get all interviews for the authenticated user.

**Response:**
```json
[
  {
    "id": "interview_id",
    "courseId": "course_id",
    "status": "completed",
    "score": 85,
    "attemptCount": 1,
    "completedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### Feedback Routes (`/api/feedback`)

#### POST `/feedback/generate` 🔒
Generate feedback for a completed interview.

**Request Body:**
```json
{
  "interviewId": "interview_id",
  "transcript": [
    {
      "role": "assistant",
      "content": "Question text"
    },
    {
      "role": "user",
      "content": "User response"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "feedback_id",
    "interviewId": "interview_id",
    "totalScore": 85,
    "breakdown": {
      "technicalKnowledge": 90,
      "communication": 80,
      "problemSolving": 85
    },
    "suggestions": ["Improve algorithm explanations"]
  }
}
```

#### GET `/feedback/:id` 🔒
Get detailed feedback for a specific interview.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "feedback_id",
    "totalScore": 85,
    "breakdown": {...},
    "detailedAnalysis": "Comprehensive feedback text",
    "strengths": ["Strong technical knowledge"],
    "improvements": ["Communication clarity"],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET `/feedback/user/all` 🔒
Get all feedback for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "feedback_id",
      "interviewId": "interview_id",
      "courseTitle": "Course Name",
      "totalScore": 85,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

> 🔒 = Protected route (requires authentication)

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- Firebase project with Admin SDK
- Google Gemini API key
- Firebase service account key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/course-pilot-backend.git
cd course-pilot-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Firebase Admin SDK**
   - Create a Firebase project
   - Generate a service account key
   - Download the JSON key file

4. **Configure environment variables**
```bash
cp .env.example .env
```

5. **Start the development server**
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# CORS Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Session Configuration (Optional - has defaults)
SESSION_DURATION=172800000  # 2 days in milliseconds
COOKIE_MAX_AGE=172800000    # 2 days in milliseconds
```

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port number | 5000 | ❌ |
| `NODE_ENV` | Environment mode | development | ❌ |
| `FIREBASE_PROJECT_ID` | Firebase project identifier | - | ✅ |
| `FIREBASE_CLIENT_EMAIL` | Service account email | - | ✅ |
| `FIREBASE_PRIVATE_KEY` | Service account private key | - | ✅ |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini AI API key | - | ✅ |
| `NEXT_PUBLIC_BASE_URL` | Frontend application URL | http://localhost:3000 | ❌ |
| `SESSION_DURATION` | Session duration in milliseconds | 172800000 (2 days) | ❌ |
| `COOKIE_MAX_AGE` | Cookie max age in milliseconds | 172800000 (2 days) | ❌ |

## API Architecture

### Route Structure

```
/api
├── /auth          # Authentication endpoints
├── /resources     # Course generation & resource search
├── /course        # Course management
├── /progress      # Learning progress tracking
├── /interviews    # Interview generation & management
└── /feedback      # Interview feedback & analysis
```

### Middleware Pipeline

```
Request → CORS → JSON Parser → Cookie Parser → Auth Middleware → Route Handler → Error Handler
```

### Authentication Middleware (`authenticateUser`)

Verifies session cookies and attaches user information to the request object.

**Features:**
- Extracts session cookie from request
- Verifies session validity with Firebase Admin
- Retrieves user data from Firestore
- Attaches user object to `req.user`
- Returns 401 for invalid/expired sessions

## Error Handling

The API uses a centralized error handling system with custom `AppError` class:

```javascript
// Custom error with status code
throw new AppError(400, "Validation failed");

// Error middleware automatically handles:
// - Status code setting
// - Error message formatting
// - Development vs production error details
```

**Error Response Format:**
```json
{
  "success": false,
  "error": "Error message here",
  "details": "Additional details (development only)"
}
```

## Business Logic Features

### Course Generation
- AI-powered course creation using Google Gemini
- Personalized learning paths based on role and experience
- Integration with external learning resources
- Automatic course structure generation

### Interview System
- Dynamic question generation based on course content
- Retake eligibility with 7-day cooldown
- Maximum 3 attempts per course
- Real-time interview status tracking

### Progress Tracking
- Granular lesson-level progress tracking
- Course completion percentages
- Time-based learning analytics
- Cross-course progress aggregation

### Feedback Generation
- AI-powered interview analysis
- Multi-dimensional scoring (technical, communication, problem-solving)
- Personalized improvement suggestions
- Historical feedback comparison

## Security Considerations

### Session Security
- **2-day session expiration**: Automatic session cleanup
- **HTTP-only cookies**: Prevents XSS attacks
- **Secure cookies**: HTTPS-only in production
- **SameSite protection**: CSRF mitigation

### API Security
- **Input validation**: Comprehensive request validation
- **Rate limiting**: Prevents API abuse
- **CORS configuration**: Restricted to frontend domains
- **Error sanitization**: No sensitive data in error responses

### Firebase Security
- **Admin SDK verification**: Server-side token validation
- **Service account isolation**: Dedicated service account for backend
- **Firestore rules**: Client-side access control (separate configuration)

## Deployment

### Railway Deployment

1. **Connect GitHub repository**
2. **Set environment variables** in Railway dashboard
3. **Deploy automatically** on push to main branch

### Heroku Deployment

1. **Create Heroku app**
```bash
heroku create course-pilot-backend
```

2. **Set environment variables**
```bash
heroku config:set FIREBASE_PROJECT_ID=your_project_id
heroku config:set FIREBASE_CLIENT_EMAIL=your_client_email
heroku config:set FIREBASE_PRIVATE_KEY="your_private_key"
heroku config:set GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
```

3. **Deploy**
```bash
git push heroku main
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## API Testing

### Using cURL

**Generate a course:**
```bash
curl -X POST http://localhost:5000/api/resources/generate \
  -H "Content-Type: application/json" \
  -d '{"targetRole":"Full Stack Developer","techStack":["React","Node.js"],"experience":"intermediate"}'
```

**Get interview status:**
```bash
curl -X GET http://localhost:5000/api/interviews/status/course_id \
  -b cookies.txt
```

### Using Postman

1. Import the API collection
2. Set up environment variables
3. Test authentication flow
4. Use cookie jar for session persistence

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.