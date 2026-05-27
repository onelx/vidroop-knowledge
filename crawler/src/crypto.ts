import crypto from "node:crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex) throw new Error("CREDENTIAL_ENCRYPTION_KEY no está seteada");
  if (hex.length !== 64) throw new Error("CREDENTIAL_ENCRYPTION_KEY debe ser 64 chars hex (32 bytes)");
  return Buffer.from(hex, "hex");
}

export function decryptCredential(blob: Buffer | Uint8Array): string {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  const key = getKey();
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
