/**
 * Cifrado de credenciales para almacenar en la BD.
 *
 * Algoritmo: AES-256-GCM
 * Key: 32 bytes hex en CREDENTIAL_ENCRYPTION_KEY (generar con `openssl rand -hex 32`)
 * Formato persistido (bytea):  iv(12) || authTag(16) || ciphertext
 */

import crypto from "node:crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex) throw new Error("CREDENTIAL_ENCRYPTION_KEY no está seteada");
  if (hex.length !== 64) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY debe ser 64 chars hex (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptCredential(plaintext: string): Buffer {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

export function decryptCredential(blob: Buffer | Uint8Array): string {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  const key = getKey();
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
