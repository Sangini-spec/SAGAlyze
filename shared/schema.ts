import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users/Clinicians table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Patients table
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: text("patient_id").notNull().unique(),
  name: text("name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  fitzpatrickType: text("fitzpatrick_type"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  accessToken: text("access_token").notNull().unique(),
  tokenLookupHash: text("token_lookup_hash").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  accessToken: true,
  tokenLookupHash: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

// Lesions table
export const lesions = pgTable("lesions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  imagePath: text("image_path").notNull(),
  location: text("location").notNull(),
  notes: text("notes"),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
});

export const insertLesionSchema = createInsertSchema(lesions).omit({
  id: true,
  capturedAt: true,
});

export type InsertLesion = z.infer<typeof insertLesionSchema>;
export type Lesion = typeof lesions.$inferSelect;

// AI Analysis results table
export const analyses = pgTable("analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lesionId: varchar("lesion_id").notNull().references(() => lesions.id),
  classification: text("classification").notNull(),
  confidence: integer("confidence").notNull(),
  benignScore: integer("benign_score").notNull(),
  malignantScore: integer("malignant_score").notNull(),
  rashScore: integer("rash_score").notNull(),
  infectionScore: integer("infection_score").notNull(),
  aiResponse: text("ai_response").notNull(),
  groundTruthLabel: text("ground_truth_label"),
  groundTruthSource: text("ground_truth_source"),
  groundTruthRecordedAt: timestamp("ground_truth_recorded_at"),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  analyzedAt: true,
  groundTruthRecordedAt: true,
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;

// Patient access tokens (OTP for patient portal)
export const patientTokens = pgTable("patient_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPatientTokenSchema = createInsertSchema(patientTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPatientToken = z.infer<typeof insertPatientTokenSchema>;
export type PatientToken = typeof patientTokens.$inferSelect;

// Patient portal access audit log
export const portalAccessLogs = pgTable("portal_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptedToken: text("attempted_token"),
  attemptedPatientId: text("attempted_patient_id"),
  attemptedName: text("attempted_name"),
  success: boolean("success").notNull(),
  patientId: varchar("patient_id").references(() => patients.id),
  failureReason: text("failure_reason"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPortalAccessLogSchema = createInsertSchema(portalAccessLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertPortalAccessLog = z.infer<typeof insertPortalAccessLogSchema>;
export type PortalAccessLog = typeof portalAccessLogs.$inferSelect;

// Fairness audit runs table
export const fairnessAuditRuns = pgTable("fairness_audit_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalSamples: integer("total_samples").notNull(),
  samplesWithGroundTruth: integer("samples_with_ground_truth").notNull(),
  overallDisparityScore: real("overall_disparity_score").notNull(),
  demographicParityGap: real("demographic_parity_gap").notNull(),
  equalOpportunityGap: real("equal_opportunity_gap").notNull(),
  calibrationGap: real("calibration_gap").notNull(),
  parityAlert: boolean("parity_alert").default(false).notNull(),
  opportunityAlert: boolean("opportunity_alert").default(false).notNull(),
  calibrationAlert: boolean("calibration_alert").default(false).notNull(),
  runAt: timestamp("run_at").defaultNow().notNull(),
});

export const insertFairnessAuditRunSchema = createInsertSchema(fairnessAuditRuns).omit({
  id: true,
  runAt: true,
});

export type InsertFairnessAuditRun = z.infer<typeof insertFairnessAuditRunSchema>;
export type FairnessAuditRun = typeof fairnessAuditRuns.$inferSelect;

// Fairness metrics table - per skin tone statistics
export const fairnessMetrics = pgTable("fairness_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditRunId: varchar("audit_run_id").notNull().references(() => fairnessAuditRuns.id),
  fitzpatrickType: text("fitzpatrick_type").notNull(),
  totalPredictions: integer("total_predictions").notNull(),
  positivePredictions: integer("positive_predictions").notNull(),
  truePositives: integer("true_positives").notNull(),
  falsePositives: integer("false_positives").notNull(),
  trueNegatives: integer("true_negatives").notNull(),
  falseNegatives: integer("false_negatives").notNull(),
  positiveRate: real("positive_rate").notNull(),
  truePositiveRate: real("true_positive_rate").notNull(),
  falsePositiveRate: real("false_positive_rate").notNull(),
  precision: real("precision").notNull(),
  recall: real("recall").notNull(),
  f1Score: real("f1_score").notNull(),
  brierScore: real("brier_score").notNull(),
  averageConfidence: real("average_confidence").notNull(),
  accuracyAtConfidence: real("accuracy_at_confidence").notNull(),
});

export const insertFairnessMetricSchema = createInsertSchema(fairnessMetrics).omit({
  id: true,
});

export type InsertFairnessMetric = z.infer<typeof insertFairnessMetricSchema>;
export type FairnessMetric = typeof fairnessMetrics.$inferSelect;
