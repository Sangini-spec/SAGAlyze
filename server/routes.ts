import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { storage } from "./storage";
import { analyzeLesionImage } from "./gemini";
import { insertPatientSchema, insertLesionSchema, insertAnalysisSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import {
  calculateFairnessMetricsPerGroup,
  calculateDisparityMetrics,
  type AnalysisWithPatient,
} from "./fairness";
import { generateAccessToken, hashAccessToken, createTokenLookupHash, verifyAccessToken, isValidTokenFormat } from "./token-utils";

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

export async function registerRoutes(app: Express): Promise<Server> {
  // Patient routes
  app.get("/api/patients", async (_req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).send("Patient not found");
      }
      res.json(patient);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);

      // Check if patient ID already exists
      const existing = await storage.getPatientByPatientId(validatedData.patientId);
      if (existing) {
        return res.status(400).send("Patient ID already exists");
      }

      // Generate and hash access token
      const plainToken = generateAccessToken();
      const hashedToken = hashAccessToken(plainToken);
      const lookupHash = createTokenLookupHash(plainToken);

      const patient = await storage.createPatient(validatedData, hashedToken, lookupHash);
      
      // Return patient with plaintext token (one-time reveal for doctor)
      res.json({ ...patient, plaintextToken: plainToken });
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  // Lesion routes
  app.get("/api/patients/:patientId/lesions", async (req, res) => {
    try {
      const lesions = await storage.getLesionsByPatientId(req.params.patientId);

      // Attach analysis data to each lesion
      const lesionsWithAnalysis = await Promise.all(
        lesions.map(async (lesion) => {
          const analysis = await storage.getAnalysisByLesionId(lesion.id);
          return { ...lesion, analysis };
        })
      );

      res.json(lesionsWithAnalysis);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Analyze lesion (upload + AI analysis)
  app.post("/api/analyze-lesion", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No image file provided");
      }

      const { patientId, location, notes } = req.body;

      if (!patientId || !location) {
        return res.status(400).send("Patient ID and location are required");
      }

      // Verify patient exists
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).send("Patient not found");
      }

      // Save image to disk with safe filename (no leading slash)
      const safeFilename = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filepath = path.join(uploadsDir, safeFilename);
      await fs.writeFile(filepath, req.file.buffer);

      // Convert image to base64 for OpenAI
      const base64Image = req.file.buffer.toString("base64");

      // Analyze with OpenAI
      const analysisResult = await analyzeLesionImage(base64Image);

      // Validate and create lesion record
      const lesionData = insertLesionSchema.parse({
        patientId,
        imagePath: `/uploads/${safeFilename}`,
        location,
        notes: notes || null,
      });

      const lesion = await storage.createLesion(lesionData);

      // Validate and create analysis record
      const analysisData = insertAnalysisSchema.parse({
        lesionId: lesion.id,
        classification: analysisResult.classification,
        confidence: analysisResult.confidence,
        benignScore: analysisResult.benignScore,
        malignantScore: analysisResult.malignantScore,
        rashScore: analysisResult.rashScore,
        infectionScore: analysisResult.infectionScore,
        aiResponse: analysisResult.reasoning,
      });

      const analysis = await storage.createAnalysis(analysisData);

      res.json({ lesion, analysis });
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).send(error.message);
    }
  });

  // Analysis routes
  app.get("/api/analyses", async (_req, res) => {
    try {
      const analyses = await storage.getAllAnalyses();

      // Attach lesion and patient data
      const analysesWithData = await Promise.all(
        analyses.map(async (analysis) => {
          const lesion = await storage.getLesion(analysis.lesionId);
          if (lesion) {
            const patient = await storage.getPatient(lesion.patientId);
            return { ...analysis, lesion: { ...lesion, patient } };
          }
          return analysis;
        })
      );

      res.json(analysesWithData);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Stats route
  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Fairness/Bias calibration routes
  app.post("/api/fairness/update-ground-truth", async (req, res) => {
    try {
      const { analysisId, groundTruthLabel, groundTruthSource } = req.body;

      if (!analysisId || !groundTruthLabel || !groundTruthSource) {
        return res.status(400).send("Analysis ID, ground truth label, and source are required");
      }

      const validClassifications = ["Benign", "Malignant", "Rash", "Infection"];
      if (!validClassifications.includes(groundTruthLabel)) {
        return res.status(400).send("Invalid ground truth label. Must be one of: Benign, Malignant, Rash, Infection");
      }

      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).send("Analysis not found");
      }

      const updatedAnalysis = await storage.updateAnalysisGroundTruth(
        analysisId,
        groundTruthLabel,
        groundTruthSource
      );

      res.json(updatedAnalysis);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/fairness/calculate", async (req, res) => {
    try {
      const { daysBack = 30 } = req.body;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const totalSamples = await storage.getAnalysesCountInDateRange(startDate, endDate);
      const analysesData = await storage.getAnalysesWithGroundTruth(startDate, endDate);

      if (analysesData.length === 0) {
        return res.status(400).send("No analyses with ground truth labels found in the specified date range");
      }

      const analysesWithPatients: AnalysisWithPatient[] = analysesData.map((item) => ({
        analysis: item.analysis,
        patient: item.patient,
      }));

      const metricsPerGroup = calculateFairnessMetricsPerGroup(analysesWithPatients);
      const disparityMetrics = calculateDisparityMetrics(metricsPerGroup);

      const samplesWithGroundTruth = analysesData.length;

      const auditRun = await storage.createFairnessAuditRun({
        startDate,
        endDate,
        totalSamples,
        samplesWithGroundTruth,
        overallDisparityScore: disparityMetrics.overallDisparityScore,
        demographicParityGap: disparityMetrics.demographicParityGap,
        equalOpportunityGap: disparityMetrics.equalOpportunityGap,
        calibrationGap: disparityMetrics.calibrationGap,
        parityAlert: disparityMetrics.parityAlert,
        opportunityAlert: disparityMetrics.opportunityAlert,
        calibrationAlert: disparityMetrics.calibrationAlert,
      });

      const metricsToInsert = metricsPerGroup.map((metric) => ({
        auditRunId: auditRun.id,
        fitzpatrickType: metric.fitzpatrickType,
        totalPredictions: metric.totalPredictions,
        positivePredictions: metric.positivePredictions,
        truePositives: metric.truePositives,
        falsePositives: metric.falsePositives,
        trueNegatives: metric.trueNegatives,
        falseNegatives: metric.falseNegatives,
        positiveRate: metric.positiveRate,
        truePositiveRate: metric.truePositiveRate,
        falsePositiveRate: metric.falsePositiveRate,
        precision: metric.precision,
        recall: metric.recall,
        f1Score: metric.f1Score,
        brierScore: metric.brierScore,
        averageConfidence: metric.averageConfidence,
        accuracyAtConfidence: metric.accuracyAtConfidence,
      }));

      await storage.createFairnessMetrics(metricsToInsert);

      res.json({ auditRun, metrics: metricsPerGroup, disparity: disparityMetrics });
    } catch (error: any) {
      console.error("Fairness calculation error:", error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/fairness/audit-runs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const auditRuns = await storage.getFairnessAuditRuns(limit);
      res.json(auditRuns);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/fairness/audit-runs/:id", async (req, res) => {
    try {
      const auditRuns = await storage.getFairnessAuditRuns(1000);
      const auditRun = auditRuns.find((run) => run.id === req.params.id);

      if (!auditRun) {
        return res.status(404).send("Audit run not found");
      }

      const metrics = await storage.getFairnessMetricsByAuditRunId(auditRun.id);

      res.json({ auditRun, metrics });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/fairness/alerts", async (req, res) => {
    try {
      const latestAuditRun = await storage.getLatestFairnessAuditRun();

      if (!latestAuditRun) {
        return res.json({ alerts: [] });
      }

      const alerts = [];

      if (latestAuditRun.parityAlert) {
        alerts.push({
          type: "demographic_parity",
          severity: "warning",
          message: `Demographic parity gap of ${(latestAuditRun.demographicParityGap * 100).toFixed(1)}% detected across skin tones`,
          gap: latestAuditRun.demographicParityGap,
        });
      }

      if (latestAuditRun.opportunityAlert) {
        alerts.push({
          type: "equal_opportunity",
          severity: "warning",
          message: `Equal opportunity gap of ${(latestAuditRun.equalOpportunityGap * 100).toFixed(1)}% detected across skin tones`,
          gap: latestAuditRun.equalOpportunityGap,
        });
      }

      if (latestAuditRun.calibrationAlert) {
        alerts.push({
          type: "calibration",
          severity: "warning",
          message: `Calibration gap of ${(latestAuditRun.calibrationGap * 100).toFixed(1)}% detected across skin tones`,
          gap: latestAuditRun.calibrationGap,
        });
      }

      res.json({ alerts, auditRun: latestAuditRun });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Patient portal routes - Secure two-step verification
  // Step 1: Verify access token exists
  app.post("/api/patient-portal/verify-token", async (req, res) => {
    try {
      const { token } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      // Rate limiting: Check recent attempts from this IP
      const recentAttempts = await storage.getRecentPortalAccessAttempts(15, ipAddress);
      if (recentAttempts > 10) {
        await storage.createPortalAccessLog({
          attemptedToken: token?.substring(0, 4) + "***",
          success: false,
          failureReason: "rate_limit_exceeded",
          ipAddress,
          attemptedPatientId: null,
          attemptedName: null,
          patientId: null,
        });
        return res.status(429).send("Too many attempts. Please try again later.");
      }

      if (!token || !isValidTokenFormat(token)) {
        await storage.createPortalAccessLog({
          attemptedToken: token?.substring(0, 4) + "***",
          success: false,
          failureReason: "invalid_token_format",
          ipAddress,
          attemptedPatientId: null,
          attemptedName: null,
          patientId: null,
        });
        return res.status(400).send("Invalid token format");
      }

      // Create lookup hash to find patient, then verify with bcrypt
      const lookupHash = createTokenLookupHash(token);
      const patient = await storage.getPatientByTokenLookupHash(lookupHash);

      if (!patient) {
        await storage.createPortalAccessLog({
          attemptedToken: token.substring(0, 4) + "***",
          success: false,
          failureReason: "token_not_found",
          ipAddress,
          attemptedPatientId: null,
          attemptedName: null,
          patientId: null,
        });
        return res.status(401).send("Invalid access token");
      }

      // Verify the token using bcrypt for security
      if (!verifyAccessToken(token, patient.accessToken)) {
        await storage.createPortalAccessLog({
          attemptedToken: token.substring(0, 4) + "***",
          success: false,
          failureReason: "token_verification_failed",
          ipAddress,
          attemptedPatientId: null,
          attemptedName: null,
          patientId: patient.id,
        });
        return res.status(401).send("Invalid access token");
      }

      // Token is valid - return minimal info for step 2
      res.json({ 
        tokenValid: true,
        message: "Token verified. Please provide your details to continue."
      });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Step 2: Verify patient identity (token + patient ID + name + DOB)
  app.post("/api/patient-portal/verify-patient", async (req, res) => {
    try {
      const { token, patientId, name, dateOfBirth } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!token || !patientId || !name || !dateOfBirth) {
        return res.status(400).send("All fields are required");
      }

      // Find patient by lookup hash, then verify with bcrypt
      const lookupHash = createTokenLookupHash(token);
      const patient = await storage.getPatientByTokenLookupHash(lookupHash);

      if (!patient || !verifyAccessToken(token, patient.accessToken)) {
        await storage.createPortalAccessLog({
          attemptedToken: token.substring(0, 4) + "***",
          attemptedPatientId: patientId,
          attemptedName: name,
          success: false,
          failureReason: "token_not_found",
          ipAddress,
          patientId: patient?.id || null,
        });
        return res.status(401).send("Access denied. Please check your information.");
      }

      // Verify all identity factors (case-insensitive name comparison)
      const nameMatch = patient.name.toLowerCase() === name.toLowerCase();
      const idMatch = patient.patientId === patientId;
      const dobMatch = patient.dateOfBirth === dateOfBirth;

      if (!nameMatch || !idMatch || !dobMatch) {
        await storage.createPortalAccessLog({
          attemptedToken: token.substring(0, 4) + "***",
          attemptedPatientId: patientId,
          attemptedName: name,
          success: false,
          failureReason: "identity_mismatch",
          ipAddress,
          patientId: patient.id,
        });
        return res.status(401).send("Patient information does not match. Please verify your details.");
      }

      // Success - log access and return session token
      await storage.createPortalAccessLog({
        attemptedToken: token.substring(0, 4) + "***",
        attemptedPatientId: patientId,
        attemptedName: name,
        success: true,
        failureReason: null,
        ipAddress,
        patientId: patient.id,
      });

      // Return verified token for subsequent data requests
      res.json({ 
        verified: true,
        accessToken: token,
        message: "Identity verified successfully"
      });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get patient portal data (after successful verification)
  app.get("/api/patient-portal/data/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token || !isValidTokenFormat(token)) {
        return res.status(400).send("Invalid token format");
      }

      // Find patient by lookup hash, then verify with bcrypt
      const lookupHash = createTokenLookupHash(token);
      const patient = await storage.getPatientByTokenLookupHash(lookupHash);

      if (!patient || !verifyAccessToken(token, patient.accessToken)) {
        return res.status(401).send("Invalid access token");
      }

      // Fetch patient data with scoped projection (only necessary fields)
      const lesions = await storage.getLesionsByPatientId(patient.id);
      const lesionsWithAnalysis = await Promise.all(
        lesions.map(async (lesion) => {
          const analysis = await storage.getAnalysisByLesionId(lesion.id);
          return { ...lesion, analysis };
        })
      );

      // Return scoped data (exclude sensitive fields like accessToken)
      const { accessToken, ...patientData } = patient;
      res.json({ 
        patient: patientData, 
        lesions: lesionsWithAnalysis 
      });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Regenerate patient access token (for lost tokens or security resets)
  app.post("/api/patients/:patientId/regenerate-token", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.patientId);
      if (!patient) {
        return res.status(404).send("Patient not found");
      }

      // Generate and hash new access token
      const plainToken = generateAccessToken();
      const hashedToken = hashAccessToken(plainToken);
      const lookupHash = createTokenLookupHash(plainToken);

      // Update patient with new token
      const updatedPatient = await storage.updatePatient(patient.id, {
        accessToken: hashedToken,
        tokenLookupHash: lookupHash,
      });

      // Return patient with plaintext token (one-time reveal)
      res.json({ ...updatedPatient, plaintextToken: plainToken });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Report generation (PDF)
  app.post("/api/reports/generate/:patientId", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.patientId);
      if (!patient) {
        return res.status(404).send("Patient not found");
      }

      const lesions = await storage.getLesionsByPatientId(patient.id);
      const lesionsWithAnalysis = await Promise.all(
        lesions.map(async (lesion) => {
          const analysis = await storage.getAnalysisByLesionId(lesion.id);
          return { ...lesion, analysis };
        })
      );

      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: "A4" });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=patient-report-${patient.patientId}.pdf`
      );

      // Pipe the PDF to the response
      doc.pipe(res);

      // Handle completion
      doc.on("end", () => {
        res.end();
      });

      // Add header
      doc.fontSize(24).fillColor("#0891b2").text("SAGAlyze", { align: "center" });
      doc.fontSize(12).fillColor("#64748b").text("Smart AI Dermatology Assistant", { align: "center" });
      doc.moveDown(2);

      // Patient Information Section
      doc.fontSize(18).fillColor("#0f172a").text("Patient Information");
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor("#334155");
      doc.text(`Name: ${patient.name}`);
      doc.text(`Patient ID: ${patient.patientId}`);
      doc.text(`Date of Birth: ${new Date(patient.dateOfBirth).toLocaleDateString()}`);
      doc.text(`Gender: ${patient.gender}`);
      if (patient.fitzpatrickType) {
        doc.text(`Fitzpatrick Skin Type: ${patient.fitzpatrickType}`);
      }
      if (patient.contactEmail) {
        doc.text(`Email: ${patient.contactEmail}`);
      }
      if (patient.contactPhone) {
        doc.text(`Phone: ${patient.contactPhone}`);
      }
      doc.moveDown(2);

      // Lesion Summary Section
      doc.fontSize(18).fillColor("#0f172a").text("Lesion Summary");
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor("#334155");
      
      if (lesions.length === 0) {
        doc.text("No lesions have been analyzed for this patient yet.");
      } else {
        doc.text(`Total Lesions Analyzed: ${lesions.length}`);
        doc.moveDown(1);

        // Individual Lesions
        lesionsWithAnalysis.forEach((lesion, i) => {
          // Check if we need a new page
          if (doc.y > 650) {
            doc.addPage();
          }

          doc.fontSize(14).fillColor("#0f172a").text(`Lesion ${i + 1}`);
          doc.fontSize(12).fillColor("#334155");
          doc.text(`Location: ${lesion.location}`);
          doc.text(`Captured: ${new Date(lesion.capturedAt).toLocaleDateString()}`);
          
          if (lesion.analysis) {
            doc.moveDown(0.3);
            doc.fontSize(13).fillColor("#0891b2").text("AI Analysis Results:");
            doc.fontSize(12).fillColor("#334155");
            doc.text(`Classification: ${lesion.analysis.classification}`);
            doc.text(`Confidence: ${lesion.analysis.confidence}%`);
            doc.text(`Benign Score: ${lesion.analysis.benignScore}%`);
            doc.text(`Malignant Score: ${lesion.analysis.malignantScore}%`);
            doc.text(`Rash Score: ${lesion.analysis.rashScore}%`);
            doc.text(`Infection Score: ${lesion.analysis.infectionScore}%`);
            doc.moveDown(0.3);
            doc.fontSize(12).fillColor("#475569");
            // Limit AI response text to prevent overflow
            const analysisText = lesion.analysis.aiResponse.length > 500
              ? lesion.analysis.aiResponse.substring(0, 500) + "..."
              : lesion.analysis.aiResponse;
            doc.text(`Analysis: ${analysisText}`, {
              width: 500,
              align: "justify",
            });
          } else {
            doc.text("Status: Pending analysis");
          }

          if (lesion.notes) {
            doc.moveDown(0.3);
            doc.fontSize(12).fillColor("#475569");
            const notesText = lesion.notes.length > 300
              ? lesion.notes.substring(0, 300) + "..."
              : lesion.notes;
            doc.text(`Clinical Notes: ${notesText}`, { width: 500, align: "justify" });
          }

          doc.moveDown(1.5);
        });
      }

      // Footer
      if (doc.y > 700) {
        doc.addPage();
      }
      doc.fontSize(10).fillColor("#94a3b8");
      doc.text(`Report generated: ${new Date().toLocaleString()}`, { align: "center" });
      doc.text("This report is for clinical use only", { align: "center" });

      // Finalize PDF
      doc.end();
    } catch (error: any) {
      console.error("PDF generation error:", error);
      if (!res.headersSent) {
        res.status(500).send(error.message);
      }
    }
  });

  // Serve uploaded images
  app.use("/uploads", async (req, res) => {
    try {
      // Extract and validate filename (remove leading slash and any path traversal)
      const requestedFile = req.path.replace(/^\//, "");
      const safeFilename = path.basename(requestedFile);
      
      // Prevent directory traversal
      if (safeFilename !== requestedFile || safeFilename.includes("..")) {
        return res.status(400).send("Invalid filename");
      }

      const filepath = path.join(uploadsDir, safeFilename);
      
      // Verify file exists
      await fs.access(filepath);
      
      // Send file
      res.sendFile(filepath);
    } catch {
      res.status(404).send("Image not found");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
