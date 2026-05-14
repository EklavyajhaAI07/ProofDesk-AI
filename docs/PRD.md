# Requirements Document

## 1. Application Overview

### 1.1 Application Name
ProofDesk

### 1.2 Application Description
ProofDesk is a document processing tool that converts unstructured documents (PDFs, images, or text messages) into actionable task lists with deadlines and generates draft replies. It helps users quickly understand what actions need to be taken from messy client communications.

## 2. Users and Use Scenarios

### 2.1 Target Users
Freelancers, consultants, and professionals who receive client instructions through various document formats and need to quickly extract actionable items.

### 2.2 Core Use Scenarios
- Freelancer receives client PDF with project changes and timeline requirements
- Professional receives screenshot of meeting notes with action items
- Consultant gets text message with multiple task requests

## 3. Page Structure and Functionality

### 3.1 Page Structure
```
ProofDesk
├── Landing/Login-Signup Page
├── Profile Completion Page
├── Processing State Page
├── Results Page
└── History Page
```

### 3.2 Landing/Login-Signup Page

#### 3.2.1 Signup Section
- Email input field with validation
- Password input field with validation
- Signup button
- Link to switch to login view

#### 3.2.2 Login Section
- Email input field
- Password input field
- Login button
- Link to switch to signup view

#### 3.2.3 Input Section (after authentication and profile completion)
- File upload area supporting PDF and image formats
- Text paste area for direct message input
- Process with ProofDesk button
- Sample file demo button for quick testing

### 3.3 Profile Completion Page

#### 3.3.1 Profile Form
- Name input field (mandatory)
- Date of Birth input field (mandatory)
- Work input field (mandatory)
- Organization input field (mandatory)
- Submit button
- Form validation for all fields

### 3.4 Processing State Page

#### 3.4.1 Loading Indicator
- Animated loader showing processing steps:
  - Reading file
  - Finding tasks
  - Preparing draft
- Extracted text preview display (if available)

### 3.5 Results Page

#### 3.5.1 Summary Card
- Display few-line summary of the document
- Positioned at top of page

#### 3.5.2 Task List Section
- Display extracted tasks in table/checklist format
- Each task shows:
  - Task title
  - Due date
  - Priority level (low, medium, high)
  - Status (default: open)
  - Checkbox to mark task as done

#### 3.5.3 Draft Reply Card
- Display AI-generated draft response
- SEND button with one-tap functionality
- Positioned as side card

### 3.6 History Page

#### 3.6.1 Document List
- Display list of previously processed documents
- Show document title and processing date
- Click on any record to reopen its results

## 4. Business Rules and Logic

### 4.1 Authentication and Profile Flow
1. New user signs up with email and password
2. After successful signup, system sends welcome email to user via Resend API
3. User is redirected to profile completion page
4. User must complete all mandatory profile fields (name, DOB, work, organization) before accessing main features
5. Returning user logs in with email and password only
6. If profile is incomplete, user is redirected to profile completion page

### 4.2 Email Delivery Configuration
1. All emails sent through Resend API using API key: [REDACTED — set in .env file]
2. Email configuration must ensure delivery to main inbox:
  - Use authenticated domain for sender address
  - Include proper SPF, DKIM, and DMARC records
  - Set appropriate email headers (Reply-To, List-Unsubscribe)
  - Use plain text version alongside HTML
  - Avoid spam trigger words in subject and body
  - Maintain proper text-to-image ratio
  - Include physical address in footer
3. Welcome email sent immediately after successful signup
4. Additional transactional emails sent for key user actions

### 4.3 Document Processing Workflow
1. User uploads file or pastes text
2. System extracts text from input
3. System sends text to OpenRouter AI (model: openai/gpt-oss-120b:free) with structured prompt
4. AI returns JSON containing summary, tasks with due dates and priorities, and draft reply
5. System validates JSON format
6. System saves all data to Supabase database
7. System displays results to user
8. System sends notification email to user upon processing completion

### 4.4 AI Processing Requirements
- Extract only explicit or strongly implied action items
- Identify due dates from document content
- Assign priority levels to tasks
- Generate professional reply draft
- Return strict JSON format only
- Apply rate limiting to prevent excessive API usage
- Implement prompt sanitization to prevent prompt injection attacks

### 4.5 Task Status Management
- Tasks default to open status upon creation
- Users can toggle task status between open and done
- Status changes persist in Supabase database

### 4.6 Data Persistence
- All uploaded documents saved with metadata in Supabase Storage
- Processing results stored and linked to source document in Supabase database
- Task status updates saved immediately
- User profile data stored in Supabase database

### 4.7 Security Rules
- Rate limiting applied to AI processing requests per user
- Input sanitization to prevent prompt injection attacks
- Secure storage of API keys and database credentials
- User data access restricted to authenticated users only

## 5. Exception and Boundary Cases

| Scenario | Handling |
|----------|----------|
| Invalid file format uploaded | Display error message and prompt for supported formats (PDF, image) |
| AI returns invalid JSON | Retry processing once; if fails again, show error and allow re-upload |
| No action items found in document | Display summary only with message indicating no tasks detected |
| Document text extraction fails | Show error message and suggest manual text paste |
| Empty text input | Prevent submission and show validation message |
| User attempts to process while another document is processing | Queue the request or show message to wait |
| Rate limit exceeded | Display message indicating limit reached and suggest trying again later |
| Prompt injection attempt detected | Reject request and log security event |
| Incomplete profile access attempt | Redirect to profile completion page |
| Invalid email format during signup | Show validation error |
| Weak password during signup | Show password requirements |
| Email delivery failure | Log error and retry sending up to 3 times |
| Resend API rate limit reached | Queue email for delayed sending |

## 6. Acceptance Criteria

1. User can successfully register with email and password
2. Welcome email is sent to user immediately after successful signup
3. Welcome email arrives in main inbox, not promotional or spam folder
4. After signup, user is redirected to profile completion page
5. Profile form validates all mandatory fields (name, DOB, work, organization)
6. User can successfully login with email and password
7. Incomplete profile redirects user to profile completion page
8. User can upload PDF or image file through upload area
9. User can paste text directly into text input area
10. Sample demo file button loads and processes example document
11. Processing page displays animated loader with step indicators
12. Results page shows summary card with document overview
13. Task list displays all extracted tasks with title, due date, priority, and status
14. Each task has functional checkbox to toggle between open and done status
15. Draft reply card displays generated response text
16. SEND button is visible and clickable on draft card
17. History page lists all previously processed documents
18. Clicking history item reopens that document's results page
19. All data persists correctly in Supabase database across sessions
20. Invalid file uploads show appropriate error messages
21. AI processing failures trigger retry mechanism
22. Rate limiting prevents excessive API usage
23. Prompt injection attempts are blocked
24. Uploaded files are stored in Supabase Storage
25. Notification email sent to user after document processing completion
26. All transactional emails delivered to main inbox with proper authentication

## 7. Technical Configuration

### 7.1 AI Provider Configuration
- Provider: OpenRouter
- API Key: [REDACTED — set in .env file]
- Model: openai/gpt-oss-120b:free

### 7.2 Email Service Configuration
- Provider: Resend
- API Key: [REDACTED — set in .env file]
- Email Types:
  - Welcome email upon signup
  - Document processing completion notification
  - Other transactional emails as needed

### 7.3 Database Configuration
- Database: Supabase
- Project URL: [REDACTED — set in .env file]
- Anon/Public Key: [REDACTED — set in .env file]
- Service Role Key: [REDACTED — set in .env file]

### 7.4 Database Schema

#### 7.4.1 users table
- id (primary key)
- email (unique)
- password_hash
- name
- date_of_birth
- work
- organization
- profile_completed (boolean)
- created_at

#### 7.4.2 documents table
- id (primary key)
- user_id (foreign key)
- title
- input_type (pdf, image, text)
- original_text
- file_url
- status (uploaded, processing, completed, failed)
- created_at

#### 7.4.3 document_outputs table
- id (primary key)
- document_id (foreign key)
- summary
- draft_reply
- raw_ai_json
- created_at

#### 7.4.4 tasks table
- id (primary key)
- document_id (foreign key)
- task_text
- due_date
- priority (low, medium, high)
- status (open, done)
- source_snippet
- created_at

#### 7.4.5 email_logs table
- id (primary key)
- user_id (foreign key)
- email_type (welcome, notification, other)
- recipient_email
- subject
- status (sent, failed, queued)
- resend_message_id
- sent_at
- created_at

### 7.5 API Endpoints

#### 7.5.1 Authentication
- POST /auth/signup
- POST /auth/login
- POST /auth/logout

#### 7.5.2 Profile
- GET /profile
- PATCH /profile

#### 7.5.3 Documents
- POST /documents/upload
- POST /documents/:id/process
- GET /documents/:id
- GET /documents

#### 7.5.4 Tasks
- PATCH /tasks/:id

#### 7.5.5 Emails
- POST /emails/send (internal use)
- GET /emails/logs (admin)

## 8. Features Not Included in This Release

- Team collaboration capabilities
- Real-time notifications
- Complex OCR pipeline beyond basic text extraction
- Calendar integrations
- Role-based permissions system
- Analytics dashboard
- Multi-user workspace features
- Advanced file format support beyond PDF and images
- Email integration for sending drafts directly from draft card
- Task assignment to other users
- Comments or notes on tasks
- Task editing or manual task creation
- Document version control
- Export functionality for tasks or summaries
- Password reset functionality
- Social login options
- Profile picture upload
- Custom email templates editor
- Email scheduling functionality
- Bulk email sending

## 9. Reference Files

1. Project specification document: MeDo.txt