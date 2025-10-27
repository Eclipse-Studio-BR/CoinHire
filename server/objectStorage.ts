// server/objectStorage.ts
// GCS-based implementation compatible with your existing routes/types.
// Works in prod with env-based Google credentials, and lets the app
// fall back to /uploads locally if GCS envs are absent.

import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAccessGroupType,
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

/** ---------- Credentials & Storage Client ---------- **/

function decodeServiceAccountFromEnv() {
  const b64 = process.env.GCS_SERVICE_ACCOUNT_B64;
  if (!b64) return undefined;
  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    throw new Error("Invalid GCS_SERVICE_ACCOUNT_B64 (failed to base64-decode/parse JSON).");
  }
}

export const objectStorageClient = new Storage({
  projectId: process.env.GCS_PROJECT_ID || undefined,
  credentials: decodeServiceAccountFromEnv(),
});

/** ---------- Path helpers ---------- **/

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  // Accept "bucket/dir/file" or "/bucket/dir/file"
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error(`Invalid path: must include a bucket name: ${path}`);
  const [bucketName, ...rest] = parts;
  return { bucketName, objectName: rest.join("/") };
}

/** v4 signed URL with method mapping */
async function signObjectURL(opts: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
  contentType?: string;
}): Promise<string> {
  const { bucketName, objectName, method, ttlSec, contentType } = opts;
  const file = objectStorageClient.bucket(bucketName).file(objectName);

  const action =
    method === "PUT" ? "write" :
    method === "GET" ? "read" :
    method === "DELETE" ? "delete" : "read";

  const [url] = await file.getSignedUrl({
    version: "v4",
    action,
    expires: Date.now() + ttlSec * 1000,
    ...(action === "write" && contentType ? { contentType } : {}),
  });

  return url;
}

/** ---------- Errors ---------- **/

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/** ---------- Service ---------- **/

export class ObjectStorageService {
  constructor() {}

  /** Public lookup roots:
   *  - Use comma-separated env PUBLIC_OBJECT_SEARCH_PATHS if provided
   *  - Otherwise default to "<GCS_BUCKET>/public"
   */
  getPublicObjectSearchPaths(): Array<string> {
    const env = (process.env.PUBLIC_OBJECT_SEARCH_PATHS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (env.length) return Array.from(new Set(env));

    const bucket = process.env.GCS_BUCKET;
    if (bucket) return [`${bucket}/public`];

    // No configured public search paths; return empty so searchPublicObject() just returns null
    return [];
  }

  /** Private dir:
   *  - Use env PRIVATE_OBJECT_DIR if set
   *  - Otherwise default to "<GCS_BUCKET>/.private"
   */
  getPrivateObjectDir(): string {
    const dir = (process.env.PRIVATE_OBJECT_DIR || "").trim();
    if (dir) return dir;

    const bucket = process.env.GCS_BUCKET;
    if (!bucket) {
      throw new Error(
        "Missing PRIVATE_OBJECT_DIR and GCS_BUCKET. Set either to enable object storage."
      );
    }
    return `${bucket}/.private`;
  }

  /** Find first existing public object under the configured roots */
  async searchPublicObject(filePath: string): Promise<File | null> {
    const roots = this.getPublicObjectSearchPaths();
    for (const root of roots) {
      const fullPath = `${root}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const file = objectStorageClient.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  /** Stream a file to the response with cache headers based on ACL policy */
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      const filename = metadata.name?.split("/").pop() || "file";

      res.setHeader("Content-Type", metadata.contentType || "application/octet-stream");
      res.setHeader(
        "Cache-Control",
        isPublic ? `public, max-age=${cacheTtlSec}` : "private, max-age=0, no-store"
      );
      if (!isPublic) {
        // Keep resume/avatar downloads private but let browsers render inline (PDF/image preview)
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      }
      if (metadata.size) res.setHeader("Content-Length", String(metadata.size));

      file
        .createReadStream()
        .on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
        })
        .pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) res.status(500).json({ error: "Error downloading file" });
    }
  }

  /** Signed PUT URL for client to upload a new object into the private space */
  async getObjectEntityUploadURL(): Promise<string> {
    const privateDir = this.getPrivateObjectDir(); // "<bucket>/.private"
    const objectId = randomUUID();
    const fullPath = `${privateDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
      // contentType is checked by the client at upload time; can be enforced here if you want
    });
  }

  /** Resolve a stored entity path ("/objects/<...>") to a GCS File */
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();

    const entityId = parts.slice(1).join("/");

    let entityDir = this.getPrivateObjectDir(); // e.g. "<bucket>/.private"
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;

    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const file = objectStorageClient.bucket(bucketName).file(objectName);

    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  /** Turn a raw GCS URL into our "/objects/<id>" canonical form (so callers can pass either) */
  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath) return rawPath;

    // Already canonical
    if (rawPath.startsWith("/objects/")) return rawPath;

    // Convert "https://storage.googleapis.com/<bucket>/<path>" into "/objects/<id>"
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      const url = new URL(rawPath);
      const rawObjectPath = url.pathname; // "/bucket/dir/file"

      let objectEntityDir = this.getPrivateObjectDir(); // "<bucket>/.private"
      if (!objectEntityDir.startsWith("/")) objectEntityDir = `/${objectEntityDir}`;
      if (!objectEntityDir.endsWith("/")) objectEntityDir = `${objectEntityDir}/`;

      // Only remap if it's inside the private area
      if (rawObjectPath.startsWith(objectEntityDir)) {
        const entityId = rawObjectPath.slice(objectEntityDir.length);
        return `/objects/${entityId}`;
      }
      // Otherwise just return the raw GCS path (caller may be handling public assets)
      return rawObjectPath;
    }

    // Pass through any other path unchanged
    return rawPath;
  }

  /** Persist ACL policy metadata on the GCS object, return normalized path */
  async trySetObjectEntityAclPolicy(rawPath: string, aclPolicy: ObjectAclPolicy): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  /** Add a company read rule to the object’s ACL policy (if missing) */
  async grantCompanyReadAccess(rawPath: string, companyId: string): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/objects/")) return normalizedPath;

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    const aclPolicy = await getObjectAclPolicy(objectFile);
    if (!aclPolicy) return normalizedPath;

    const hasRule = (aclPolicy.aclRules ?? []).some(
      (rule) =>
        rule.group.type === ObjectAccessGroupType.COMPANY_MEMBERS &&
        rule.group.id === companyId &&
        [ObjectPermission.READ, ObjectPermission.WRITE].includes(rule.permission)
    );

    if (!hasRule) {
      const updated: ObjectAclPolicy = {
        ...aclPolicy,
        aclRules: [
          ...(aclPolicy.aclRules ?? []),
          {
            group: { type: ObjectAccessGroupType.COMPANY_MEMBERS, id: companyId },
            permission: ObjectPermission.READ,
          },
        ],
      };
      await setObjectAclPolicy(objectFile, updated);
    }
    return normalizedPath;
  }

  /** Check if a user can access an object given a requested permission */
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}
