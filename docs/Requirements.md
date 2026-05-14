# Requirements Document

## 1. Application Overview

### 1.1 Application Name
ProofDesk

### 1.2 Application Description
ProofDesk is a document processing tool that converts unstructured documents (PDFs, images, or text messages) into actionable task lists with deadlines and generates draft replies. It helps users quickly understand what actions need to be taken from messy client communications.

## 2. Users and Use Scenarios

### 2.1 Target Users
Freelancers, consultants, students and professionals who receive client instructions through various document formats and need to quickly extract actionable items.

### 2.2 Core Use Scenarios
- Freelancer receives client PDF with project changes and timeline requirements
- Professional receives screenshot of meeting notes with action items
- Consultant gets text message with multiple task requests

## 3. Page Structure and Functionality

### 3.1 Page Structure
```
ProofDesk
├── Landing/Login-Signup Page
├── Processing State Page
├── Results Page
└── History Page
```

### 3.2 Landing/Login-Signup Page

#### 3.2.1 Login/Signup Section
- Email and password input fields
- Login button
- Signup button
- Form validation for email format and password requirements

#### 3.2.2 Input Section (after authentication)
- File upload area supporting PDF and image formats
- Text paste area for direct message input
- Process with ProofDesk button
- Sample file demo button for quick testing

### 3.3 Processing State Page

#### 3.3.1 Loading Indicator
- Animated loader showing processing steps:
  - Reading file
  - Finding tasks
  - Preparing draft
- Extracted text preview display (if available)

### 3.4 Results Page

#### 3.4.1 Summary Card
- Display few-line summary of the document
- Positioned at top of page

#### 3.4.2 Task List Section
- Display extracted tasks in table/checklist format
- Each task shows:
  - Task title
  - Due date
  - Priority level (low, medium, high)
  - Status (default: open)
  - Checkbox to mark task as done

#### 3.4.3 Draft Reply Card
- Display AI-generated draft response
- SEND button with one-tap functionality
- Positioned as side card

### 3.5 History Page

#### 3.5.1 Document List
- Display list of previously processed documents
- Show document title and processing date
- Click on any record to reopen its results

## 4. Business Rules and Logic

### 4.1 Document Processing Workflow
1. User uploads file or pastes text
2. System extracts text from input
3. System sends text to AI with structured prompt
4. AI returns JSON containing summary, tasks with due dates and priorities, and draft reply
5. System validates JSON format
6. System saves all data to database
7. System displays results to user

### 4.2 AI Processing Requirements
- Extract only explicit or strongly implied action items
- Identify due dates from document content
- Assign priority levels to tasks
- Generate professional reply draft
- Return strict JSON format only

### 4.3 Task Status Management
- Tasks default to open status upon creation
- Users can toggle task status between open and done
- Status changes persist in database

### 4.4 Data Persistence
- All uploaded documents saved with metadata
- Processing results stored and linked to source document
- Task status updates saved immediately

## 5. Exception and Boundary Cases

| Scenario | Handling |
|----------|----------|
| Invalid file format uploaded | Display error message and prompt for supported formats (PDF, image) |
| AI returns invalid JSON | Retry processing once; if fails again, show error and allow re-upload |
| No action items found in document | Display summary only with message indicating no tasks detected |
| Document text extraction fails | Show error message and suggest manual text paste |
| Empty text input | Prevent submission and show validation message |
| User attempts to process while another document is processing | Queue the request or show message to wait |

## 6. Acceptance Criteria

1. User can successfully register and login with email and password
2. User can upload PDF or image file through upload area
3. User can paste text directly into text input area
4. Sample demo file button loads and processes example document
5. Processing page displays animated loader with step indicators
6. Results page shows summary card with document overview
7. Task list displays all extracted tasks with title, due date, priority, and status
8. Each task has functional checkbox to toggle between open and done status
9. Draft reply card displays generated response text
10. SEND button is visible and clickable on draft card
11. History page lists all previously processed documents
12. Clicking history item reopens that document's results page
13. All data persists correctly in database across sessions
14. Invalid file uploads show appropriate error messages
15. AI processing failures trigger retry mechanism

## 7. Features Not Included in This Release

- Team collaboration capabilities
- Real-time notifications
- Complex OCR pipeline beyond basic text extraction
- Calendar integrations
- Role-based permissions system
- Analytics dashboard
- Multi-user workspace features
- Advanced file format support beyond PDF and images
- Email integration for sending drafts directly
- Task assignment to other users
- Comments or notes on tasks
- Task editing or manual task creation
- Document version control
- Export functionality for tasks or summaries

## 8. Reference Files

1. Project specification document: MeDo.txt