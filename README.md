# SAGAlyze - Smart AI Dermatology Assistant

## Overview

SAGAlyze is a full-stack clinical web application designed for dermatologists to classify skin lesions using AI, track patient progress over time, and generate comprehensive medical reports. The system prioritizes data privacy, offline capability, and fairness across all Fitzpatrick skin tones while maintaining a professional medical interface.

**Core Capabilities:**
- AI-powered skin lesion classification (Benign, Malignant, Rash, Infection)
- Patient management with medical record tracking
- Before/after lesion comparison with visual analysis
- PDF report generation for clinical documentation
- Secure patient portal with OTP-based access
- **AI Fairness Calibration** - Bias detection and monitoring across Fitzpatrick skin tones
- Medical-grade UI following Material Design principles

## Recent Changes

**November 22, 2025: Fully Functional Secure Patient Portal with Two-Step Verification**
- ✅ **Complete Flow Working**: Token generation → Token verification → Identity verification → Patient data access
- ✅ **Backend API Tested**: All endpoints verified working (verify-token, verify-patient, get-data)
- Implemented HIPAA-grade security with hybrid hashing: HMAC-SHA256 for efficient lookup + bcrypt (10 rounds) for secure verification
- Added two-step patient verification: Step 1 verifies token exists, Step 2 verifies patient identity (token + Patient ID + name + DOB)
- Created permanent access tokens (12 characters, format: XXXX-XXXX-XXXX) auto-generated on patient creation with one-time plaintext reveal
- Implemented token regeneration capability for lost tokens with confirmation dialogs and copy-to-clipboard
- Added comprehensive audit logging (portalAccessLogs table) tracking all access attempts with IP addresses and failure reasons
- Implemented rate limiting (10 attempts per 15 minutes per IP) to prevent brute force attacks
- Created tokenLookupHash and accessToken fields in patients table for hybrid hashing security
- Enhanced UX with security warnings in token reveal dialogs and clear multi-step verification flow
- Scoped patient data projection excludes sensitive fields from portal API responses

**November 16, 2025: Enhanced Progress Tracker with Interactive Image Comparison**
- Implemented interactive drag slider for side-by-side lesion comparison
- Added clinical improvement calculation algorithm with severity mapping (Benign=1, Rash=2, Infection=3, Malignant=4)
- Created bidirectional progress metrics showing positive improvement scores and negative deterioration scores
- Added trend indicators (Improved/Worsened/No Change) with color-coded badges and icons
- Implemented visual progress bars with contextual colors (green for improvement, red for deterioration)
- Enhanced mobile touch interaction with preventDefault and touchAction safeguards
- Added accessibility features (ARIA attributes, keyboard focus support)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React 18 with Vite for fast development and optimized builds

**UI Component System:** 
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with custom medical theme
- Design follows Material Design adapted for healthcare (see `design_guidelines.md`)
- Roboto font family for professional medical aesthetic

**State Management:**
- TanStack React Query (v5) for server state management and caching
- React Hook Form with Zod validation for form handling
- Wouter for lightweight client-side routing

**Key Design Decisions:**
- **Material Design over custom framework:** Provides familiar, accessible patterns appropriate for clinical software
- **Tailwind + shadcn/ui:** Enables rapid component development while maintaining consistency
- **Image-first layout:** Lesion photographs are primary content, given visual prominence in all views
- **Responsive grid system:** 2-3 column layouts for patient cards, single column for forms (max-w-2xl)

### Backend Architecture

**Framework:** Express.js with TypeScript running on Node.js

**API Design:**
- RESTful endpoints organized by resource type (patients, lesions, analyses, reports)
- Multer middleware for image upload handling (10MB limit, image files only)
- Session-based authentication approach (session storage configured)
- File storage in `/uploads` directory for lesion images

**Key Routes:**
- `/api/patients` - CRUD operations for patient records
- `/api/patients/:id/lesions` - Lesion management per patient
- `/api/analyze-lesion` - AI classification endpoint
- `/api/reports/generate/:id` - PDF report generation
- `/api/patient-portal/verify` - OTP-based patient access
- `/api/fairness/*` - Bias detection, ground truth tracking, and fairness metrics

**AI Integration:**
- Google Gemini 2.5 Flash API for lesion image analysis via Replit AI Integrations (switched from OpenAI per user request)
- Returns structured JSON with classification, confidence scores (0-100), and clinical reasoning
- Four classification categories: Benign, Malignant, Rash, Infection
- Base64 image encoding for API transmission
- Uses AI_INTEGRATIONS_GEMINI_BASE_URL and AI_INTEGRATIONS_GEMINI_API_KEY environment variables

**Storage Layer:**
- Abstract `IStorage` interface in `server/storage.ts` defines data operations
- **DbStorage** implementation uses PostgreSQL via Drizzle ORM for persistent data storage
- Schema includes: users, patients, lesions, analyses, patient_tokens tables
- Uses UUID primary keys with `gen_random_uuid()`
- Timestamps track creation and updates
- Database schema synced using `npm run db:push` command

**Key Design Decisions:**
- **Express over Next.js API routes:** Separation of concerns, easier to scale backend independently
- **OpenAI GPT-5 for AI:** Provides vision analysis without requiring local model infrastructure; simplifies deployment
- **Abstract storage interface:** Enables future database swapping or adding caching layers
- **File-based image storage:** Simple approach suitable for prototype; images referenced by path in database

### Data Storage

**Database:** PostgreSQL (configured via Drizzle ORM)

**Schema Structure:**

1. **users** - Clinician accounts
   - id (UUID), username (unique), password (hashed), fullName, createdAt

2. **patients** - Patient medical records
   - id (UUID), patientId (unique identifier), name, dateOfBirth, gender
   - fitzpatrickType (skin tone classification for fairness tracking)
   - contactEmail, contactPhone, timestamps

3. **lesions** - Captured lesion images
   - id (UUID), patientId (foreign key), location (body part), imagePath
   - notes (clinical observations), capturedAt timestamp

4. **analyses** - AI classification results
   - id (UUID), lesionId (foreign key), classification, confidence (0-100)
   - benignScore, malignantScore, rashScore, infectionScore
   - reasoning (clinical explanation), analyzedAt timestamp
   - groundTruthLabel, groundTruthSource, groundTruthRecordedAt (for fairness calibration)

5. **patient_tokens** - Temporary access tokens for patient portal
   - token (primary key), patientId (foreign key), expiresAt timestamp

6. **fairness_audit_runs** - AI fairness audit metadata
   - id (UUID), startDate, endDate, totalSamples, samplesWithGroundTruth
   - overallDisparityScore, demographicParityGap, equalOpportunityGap, calibrationGap
   - parityAlert, opportunityAlert, calibrationAlert (boolean flags), runAt timestamp

7. **fairness_metrics** - Per-skin-tone bias statistics
   - id (UUID), auditRunId (foreign key), fitzpatrickType
   - Confusion matrix: truePositives, falsePositives, trueNegatives, falseNegatives
   - Performance metrics: positiveRate, truePositiveRate, falsePositiveRate
   - precision, recall, f1Score, brierScore, averageConfidence, accuracyAtConfidence

**Migration Management:** Drizzle Kit with migrations stored in `/migrations` directory

**Key Design Decisions:**
- **PostgreSQL chosen for reliability:** ACID compliance critical for medical data
- **Separate analyses table:** Allows multiple analyses per lesion over time for progress tracking
- **Fitzpatrick type tracking:** Ensures fairness monitoring across skin tones as specified in requirements
- **Time-limited patient tokens:** Security-first approach for patient portal access

### External Dependencies

**AI/ML Services:**
- OpenAI API (GPT-5) - Vision-based lesion classification and analysis
- API key configured via `OPENAI_API_KEY` environment variable

**Database:**
- Neon PostgreSQL serverless database
- Connection via `@neondatabase/serverless` driver
- Configured through `DATABASE_URL` environment variable

**File Upload:**
- Multer for multipart/form-data handling
- Local filesystem storage in `/uploads` directory

**PDF Generation:**
- PDFKit for creating clinical reports
- Generates downloadable patient progress reports

**Session Management:**
- connect-pg-simple for PostgreSQL-backed sessions
- Enables secure authentication state persistence

**UI Component Libraries:**
- Radix UI primitives (19 components imported) - Accessible, unstyled components
- Lucide React - Icon library with medical/clinical icons
- date-fns - Date formatting and manipulation

**Development Tools:**
- Vite with React plugin for fast HMR
- Replit-specific plugins for runtime error handling and development features
- ESBuild for production server bundling

**Key Design Decisions:**
- **Serverless database (Neon):** Reduces infrastructure management, scales automatically
- **OpenAI over local ML models:** Prioritizes development speed; local inference can be added later
- **PostgreSQL session storage:** More robust than in-memory for production medical applications
- **Radix UI foundation:** Ensures WCAG compliance critical for medical software accessibility

### AI Fairness Calibration System

**Overview:**
The application includes a comprehensive bias detection and calibration system that monitors AI performance across Fitzpatrick skin tone classifications (I-VI). This ensures equitable diagnostic accuracy regardless of patient skin tone.

**Key Components:**

1. **Ground Truth Collection** (`/analyses` page)
   - Clinicians can verify AI predictions by recording correct diagnoses
   - Ground truth labels validated against classification vocabulary (Benign, Malignant, Rash, Infection)
   - Source tracking (clinician_review) for audit trails

2. **Fairness Metrics Calculation** (`server/fairness.ts`)
   - **Demographic Parity:** Measures equal positive prediction rates across skin tones
   - **Equal Opportunity:** Tracks true positive rate (TPR) equity across groups
   - **Calibration Metrics:** Brier score to assess prediction confidence accuracy
   - Confusion matrix statistics per Fitzpatrick type (TP, FP, TN, FN)
   - Performance metrics: precision, recall, F1 score per skin tone

3. **Audit Runs** (triggered manually or scheduled)
   - Aggregates fairness metrics over configurable time windows (7, 30, 90 days)
   - Calculates disparity gaps: max-min difference across skin tone groups
   - Automated alert system with configurable thresholds:
     - Demographic parity gap > 15%
     - Equal opportunity gap > 15%
     - Calibration gap > 10%

4. **Fairness Dashboard** (`/fairness` page)
   - Real-time bias alerts with severity indicators
   - Summary cards: overall disparity score, demographic parity, equal opportunity, calibration
   - Visualizations: positive rate comparison, performance metrics, confusion matrices
   - Historical audit run tracking for trend analysis

**Workflow:**
1. Clinicians analyze lesions using AI (existing functionality)
2. Clinicians verify diagnoses on Analysis History page → ground truth recorded
3. System accumulates verified samples across all Fitzpatrick types
4. Clinician triggers fairness audit via dashboard "Calculate Metrics" button
5. System computes bias metrics and generates alerts if thresholds exceeded
6. Dashboard displays results with actionable insights for bias mitigation

**Technical Implementation:**
- API Endpoints:
  - `POST /api/fairness/update-ground-truth` - Record verified diagnosis
  - `POST /api/fairness/calculate` - Trigger fairness audit run
  - `GET /api/fairness/audit-runs` - Retrieve historical audits
  - `GET /api/fairness/alerts` - Get active bias alerts
- Fairness calculations use "Malignant" and "Infection" as positive class for medical urgency
- All metrics stored in PostgreSQL for long-term monitoring and compliance

**Key Design Decisions:**
- **Clinician-driven ground truth:** Medical professionals verify AI predictions rather than automated systems
- **Windowed analysis:** Time-based audits allow tracking bias trends over deployment lifecycle
- **Alert thresholds:** Based on established fairness research (15% for parity/opportunity, 10% for calibration)
- **Per-group metrics:** Fitzpatrick-specific statistics enable targeted bias investigation
