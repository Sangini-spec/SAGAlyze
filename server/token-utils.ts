import crypto from "crypto";
import bcrypt from "bcrypt";

const LOOKUP_SECRET = process.env.TOKEN_LOOKUP_SECRET || "SAGAlyze-Token-Lookup-v1";

/**
 * Generates a secure random access token for patient portal access
 * Format: XXXX-XXXX-XXXX (12 characters + 2 hyphens = 14 total)
 * Uses cryptographically secure random bytes
 * Returns the plaintext token (show to clinician once, then hash before storing)
 */
export function generateAccessToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid ambiguous characters (0,O,1,I)
  const segments = 3;
  const segmentLength = 4;
  
  const tokenSegments: string[] = [];
  
  for (let i = 0; i < segments; i++) {
    let segment = "";
    const randomBytes = crypto.randomBytes(segmentLength);
    
    for (let j = 0; j < segmentLength; j++) {
      const randomIndex = randomBytes[j] % chars.length;
      segment += chars[randomIndex];
    }
    
    tokenSegments.push(segment);
  }
  
  return tokenSegments.join("-");
}

/**
 * Creates a deterministic lookup hash for efficient database queries
 * Uses HMAC-SHA256 with a secret key to prevent rainbow table attacks
 * This is used ONLY for lookup - the actual token is verified with bcrypt
 * 
 * @param token - The plaintext access token
 * @returns A deterministic hex string for database lookup
 */
export function createTokenLookupHash(token: string): string {
  return crypto.createHmac("sha256", LOOKUP_SECRET).update(token).digest("hex");
}

/**
 * Hashes an access token for secure storage using bcrypt
 * Uses adaptive hashing with per-token salting for maximum security
 * 
 * @param token - The plaintext access token
 * @returns The bcrypt hash for storage (60-character string)
 */
export function hashAccessToken(token: string): string {
  // Use bcrypt with 10 salt rounds (good balance of security and performance)
  const saltRounds = 10;
  return bcrypt.hashSync(token, saltRounds);
}

/**
 * Verifies a plaintext token against its stored bcrypt hash
 * Uses constant-time comparison to prevent timing attacks
 * 
 * @param plainToken - The plaintext token provided by the user
 * @param hashedToken - The stored bcrypt hash from the database
 * @returns True if the tokens match
 */
export function verifyAccessToken(plainToken: string, hashedToken: string): boolean {
  try {
    return bcrypt.compareSync(plainToken, hashedToken);
  } catch (error) {
    // Invalid hash format or comparison error
    return false;
  }
}

/**
 * Validates access token format
 * Expected format: XXXX-XXXX-XXXX
 */
export function isValidTokenFormat(token: string): boolean {
  const pattern = /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  return pattern.test(token);
}
