import {
  type User,
  type InsertUser,
  type Patient,
  type InsertPatient,
  type Lesion,
  type InsertLesion,
  type Analysis,
  type InsertAnalysis,
  type PatientToken,
  type InsertPatientToken,
  type PortalAccessLog,
  type InsertPortalAccessLog,
  type FairnessAuditRun,
  type InsertFairnessAuditRun,
  type FairnessMetric,
  type InsertFairnessMetric,
  users,
  patients,
  lesions,
  analyses,
  patientTokens,
  portalAccessLogs,
  fairnessAuditRuns,
  fairnessMetrics,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, sql, isNotNull, and, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByPatientId(patientId: string): Promise<Patient | undefined>;
  getPatientByTokenLookupHash(lookupHash: string): Promise<Patient | undefined>;
  getAllPatients(): Promise<Patient[]>;
  createPatient(patient: InsertPatient, accessToken: string, tokenLookupHash: string): Promise<Patient>;
  updatePatient(id: string, patient: Partial<Patient>): Promise<Patient | undefined>;

  // Lesions
  getLesion(id: string): Promise<Lesion | undefined>;
  getLesionsByPatientId(patientId: string): Promise<Lesion[]>;
  createLesion(lesion: InsertLesion): Promise<Lesion>;

  // Analyses
  getAnalysis(id: string): Promise<Analysis | undefined>;
  getAnalysisByLesionId(lesionId: string): Promise<Analysis | undefined>;
  getAllAnalyses(): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  updateAnalysisGroundTruth(
    id: string,
    groundTruthLabel: string,
    groundTruthSource: string
  ): Promise<Analysis | undefined>;
  getAnalysesWithGroundTruth(startDate: Date, endDate: Date): Promise<
    Array<{
      analysis: Analysis;
      lesion: Lesion;
      patient: Patient;
    }>
  >;
  getAnalysesCountInDateRange(startDate: Date, endDate: Date): Promise<number>;

  // Patient Tokens
  getPatientToken(token: string): Promise<PatientToken | undefined>;
  createPatientToken(tokenData: InsertPatientToken): Promise<PatientToken>;
  deleteExpiredTokens(): Promise<void>;

  // Portal Access Audit Logging
  createPortalAccessLog(log: InsertPortalAccessLog): Promise<PortalAccessLog>;
  getRecentPortalAccessAttempts(minutesAgo: number, ipAddress?: string): Promise<number>;

  // Fairness Audit
  createFairnessAuditRun(auditRun: InsertFairnessAuditRun): Promise<FairnessAuditRun>;
  getFairnessAuditRuns(limit?: number): Promise<FairnessAuditRun[]>;
  getLatestFairnessAuditRun(): Promise<FairnessAuditRun | undefined>;
  createFairnessMetrics(metrics: InsertFairnessMetric[]): Promise<FairnessMetric[]>;
  getFairnessMetricsByAuditRunId(auditRunId: string): Promise<FairnessMetric[]>;

  // Stats
  getStats(): Promise<{
    totalPatients: number;
    totalLesions: number;
    recentAnalyses: number;
  }>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.id, id));
    return result[0];
  }

  async getPatientByPatientId(patientId: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.patientId, patientId));
    return result[0];
  }

  async getPatientByTokenLookupHash(lookupHash: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.tokenLookupHash, lookupHash));
    return result[0];
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async createPatient(insertPatient: InsertPatient, accessToken: string, tokenLookupHash: string): Promise<Patient> {
    const result = await db.insert(patients).values({ ...insertPatient, accessToken, tokenLookupHash }).returning();
    return result[0];
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    const result = await db
      .update(patients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return result[0];
  }

  // Lesions
  async getLesion(id: string): Promise<Lesion | undefined> {
    const result = await db.select().from(lesions).where(eq(lesions.id, id));
    return result[0];
  }

  async getLesionsByPatientId(patientId: string): Promise<Lesion[]> {
    return await db
      .select()
      .from(lesions)
      .where(eq(lesions.patientId, patientId))
      .orderBy(desc(lesions.capturedAt));
  }

  async createLesion(insertLesion: InsertLesion): Promise<Lesion> {
    const result = await db.insert(lesions).values(insertLesion).returning();
    return result[0];
  }

  // Analyses
  async getAnalysis(id: string): Promise<Analysis | undefined> {
    const result = await db.select().from(analyses).where(eq(analyses.id, id));
    return result[0];
  }

  async getAnalysisByLesionId(lesionId: string): Promise<Analysis | undefined> {
    const result = await db.select().from(analyses).where(eq(analyses.lesionId, lesionId));
    return result[0];
  }

  async getAllAnalyses(): Promise<Analysis[]> {
    return await db.select().from(analyses).orderBy(desc(analyses.analyzedAt));
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const result = await db.insert(analyses).values(insertAnalysis).returning();
    return result[0];
  }

  async updateAnalysisGroundTruth(
    id: string,
    groundTruthLabel: string,
    groundTruthSource: string
  ): Promise<Analysis | undefined> {
    const result = await db
      .update(analyses)
      .set({
        groundTruthLabel,
        groundTruthSource,
        groundTruthRecordedAt: new Date(),
      })
      .where(eq(analyses.id, id))
      .returning();
    return result[0];
  }

  async getAnalysesWithGroundTruth(startDate: Date, endDate: Date): Promise<
    Array<{
      analysis: Analysis;
      lesion: Lesion;
      patient: Patient;
    }>
  > {
    const analysesData = await db
      .select()
      .from(analyses)
      .where(
        and(
          isNotNull(analyses.groundTruthLabel),
          gte(analyses.analyzedAt, startDate),
          lte(analyses.analyzedAt, endDate)
        )
      );

    const results = await Promise.all(
      analysesData.map(async (analysis) => {
        const lesion = await this.getLesion(analysis.lesionId);
        if (!lesion) {
          throw new Error(`Lesion not found for analysis ${analysis.id}`);
        }
        const patient = await this.getPatient(lesion.patientId);
        if (!patient) {
          throw new Error(`Patient not found for lesion ${lesion.id}`);
        }
        return { analysis, lesion, patient };
      })
    );

    return results;
  }

  async getAnalysesCountInDateRange(startDate: Date, endDate: Date): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyses)
      .where(
        and(
          gte(analyses.analyzedAt, startDate),
          lte(analyses.analyzedAt, endDate)
        )
      );
    
    return Number(result[0].count);
  }

  // Patient Tokens
  async getPatientToken(token: string): Promise<PatientToken | undefined> {
    const result = await db
      .select()
      .from(patientTokens)
      .where(eq(patientTokens.token, token));
    
    if (!result[0]) return undefined;
    
    if (new Date(result[0].expiresAt) < new Date()) {
      await db.delete(patientTokens).where(eq(patientTokens.token, token));
      return undefined;
    }
    
    return result[0];
  }

  async createPatientToken(insertToken: InsertPatientToken): Promise<PatientToken> {
    const result = await db.insert(patientTokens).values(insertToken).returning();
    return result[0];
  }

  async deleteExpiredTokens(): Promise<void> {
    await db.delete(patientTokens).where(gte(patientTokens.expiresAt, new Date()));
  }

  // Portal Access Audit Logging
  async createPortalAccessLog(insertLog: InsertPortalAccessLog): Promise<PortalAccessLog> {
    const result = await db.insert(portalAccessLogs).values(insertLog).returning();
    return result[0];
  }

  async getRecentPortalAccessAttempts(minutesAgo: number, ipAddress?: string): Promise<number> {
    const timeThreshold = new Date(Date.now() - minutesAgo * 60 * 1000);
    const conditions = [gte(portalAccessLogs.createdAt, timeThreshold)];
    
    if (ipAddress) {
      conditions.push(eq(portalAccessLogs.ipAddress, ipAddress));
    }
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(portalAccessLogs)
      .where(and(...conditions));
    
    return Number(result[0].count);
  }

  // Fairness Audit
  async createFairnessAuditRun(insertAuditRun: InsertFairnessAuditRun): Promise<FairnessAuditRun> {
    const result = await db.insert(fairnessAuditRuns).values(insertAuditRun).returning();
    return result[0];
  }

  async getFairnessAuditRuns(limit: number = 10): Promise<FairnessAuditRun[]> {
    return await db
      .select()
      .from(fairnessAuditRuns)
      .orderBy(desc(fairnessAuditRuns.runAt))
      .limit(limit);
  }

  async getLatestFairnessAuditRun(): Promise<FairnessAuditRun | undefined> {
    const result = await db
      .select()
      .from(fairnessAuditRuns)
      .orderBy(desc(fairnessAuditRuns.runAt))
      .limit(1);
    return result[0];
  }

  async createFairnessMetrics(insertMetrics: InsertFairnessMetric[]): Promise<FairnessMetric[]> {
    if (insertMetrics.length === 0) return [];
    const result = await db.insert(fairnessMetrics).values(insertMetrics).returning();
    return result;
  }

  async getFairnessMetricsByAuditRunId(auditRunId: string): Promise<FairnessMetric[]> {
    return await db
      .select()
      .from(fairnessMetrics)
      .where(eq(fairnessMetrics.auditRunId, auditRunId));
  }

  // Stats
  async getStats(): Promise<{
    totalPatients: number;
    totalLesions: number;
    recentAnalyses: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [patientCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients);

    const [lesionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lesions);

    const [recentAnalysisCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyses)
      .where(gte(analyses.analyzedAt, sevenDaysAgo));

    return {
      totalPatients: Number(patientCount.count),
      totalLesions: Number(lesionCount.count),
      recentAnalyses: Number(recentAnalysisCount.count),
    };
  }
}

// Use DbStorage for persistent database storage
export const storage = new DbStorage();
