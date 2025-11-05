// scripts/migrate-uploads-to-gcs.ts
// Migration script to move existing local uploads to Google Cloud Storage

import { Storage } from "@google-cloud/storage";
import { pool } from "../server/db";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: process.env.GCS_SERVICE_ACCOUNT_B64 ? JSON.parse(
    Buffer.from(process.env.GCS_SERVICE_ACCOUNT_B64, "base64").toString("utf8")
  ) : undefined,
});

const bucket = storage.bucket(process.env.GCS_BUCKET || "");

async function migrateLocalUpload(localPath: string, type: "logo" | "avatar" | "resume") {
  const filename = path.basename(localPath);
  const privateDir = `${process.env.GCS_BUCKET}/.private/${type}s`;
  const objectId = randomUUID();
  const ext = path.extname(filename);
  const gcsPath = `${privateDir}/${objectId}${ext}`;

  console.log(`  Uploading ${localPath} → gs://${gcsPath}`);

  // Upload to GCS
  await bucket.upload(localPath, {
    destination: gcsPath.replace(`${process.env.GCS_BUCKET}/`, ""),
    metadata: {
      contentType: getContentType(localPath),
      metadata: {
        originalFilename: filename,
        uploadedAt: new Date().toISOString(),
        migratedFrom: localPath,
      },
    },
  });

  // Return canonical path
  return `/objects/${type}s/${objectId}${ext}`;
}

async function main() {
  console.log("🔍 Finding local uploads in database...\n");

  // Check environment variables
  if (!process.env.GCS_BUCKET || !process.env.GCS_PROJECT_ID || !process.env.GCS_SERVICE_ACCOUNT_B64) {
    console.error("❌ Missing GCS environment variables. Please set:");
    console.error("   - GCS_BUCKET");
    console.error("   - GCS_PROJECT_ID");
    console.error("   - GCS_SERVICE_ACCOUNT_B64");
    process.exit(1);
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  // Migrate company logos
  console.log("📸 Migrating company logos...");
  const companies = await pool.query(
    "SELECT id, logo FROM companies WHERE logo LIKE '/uploads/logos/%'"
  );
  for (const company of companies.rows) {
    try {
      const localPath = path.join(process.cwd(), company.logo.slice(1)); // Remove leading /
      if (fs.existsSync(localPath)) {
        const gcsPath = await migrateLocalUpload(localPath, "logo");
        await pool.query("UPDATE companies SET logo = $1 WHERE id = $2", [gcsPath, company.id]);
        console.log(`  ✅ Company ${company.id}: ${company.logo} → ${gcsPath}`);
        migrated++;
      } else {
        console.log(`  ⚠️  Company ${company.id}: File not found at ${localPath}`);
        skipped++;
      }
    } catch (error) {
      console.error(`  ❌ Company ${company.id}: ${error}`);
      errors++;
    }
  }

  // Migrate user avatars
  console.log("\n👤 Migrating user avatars...");
  const users = await pool.query(
    "SELECT id, avatar FROM users WHERE avatar LIKE '/uploads/avatars/%'"
  );
  for (const user of users.rows) {
    try {
      const localPath = path.join(process.cwd(), user.avatar.slice(1));
      if (fs.existsSync(localPath)) {
        const gcsPath = await migrateLocalUpload(localPath, "avatar");
        await pool.query("UPDATE users SET avatar = $1 WHERE id = $2", [gcsPath, user.id]);
        console.log(`  ✅ User ${user.id}: ${user.avatar} → ${gcsPath}`);
        migrated++;
      } else {
        console.log(`  ⚠️  User ${user.id}: File not found at ${localPath}`);
        skipped++;
      }
    } catch (error) {
      console.error(`  ❌ User ${user.id}: ${error}`);
      errors++;
    }
  }

  // Migrate talent resumes
  console.log("\n📄 Migrating talent resumes...");
  const talents = await pool.query(
    "SELECT user_id, resume FROM talent_profiles WHERE resume LIKE '/uploads/resumes/%'"
  );
  for (const talent of talents.rows) {
    try {
      const localPath = path.join(process.cwd(), talent.resume.slice(1));
      if (fs.existsSync(localPath)) {
        const gcsPath = await migrateLocalUpload(localPath, "resume");
        await pool.query("UPDATE talent_profiles SET resume = $1 WHERE user_id = $2", [
          gcsPath,
          talent.user_id,
        ]);
        console.log(`  ✅ Talent ${talent.user_id}: ${talent.resume} → ${gcsPath}`);
        migrated++;
      } else {
        console.log(`  ⚠️  Talent ${talent.user_id}: File not found at ${localPath}`);
        skipped++;
      }
    } catch (error) {
      console.error(`  ❌ Talent ${talent.user_id}: ${error}`);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ Migration complete!");
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Errors:   ${errors}`);
  console.log("=".repeat(60));

  if (errors > 0) {
    console.log("\n⚠️  Some uploads failed to migrate. Review errors above.");
    process.exit(1);
  }

  pool.end();
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return types[ext] || "application/octet-stream";
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  pool.end();
  process.exit(1);
});
