import { pool } from "../server/db";
import fs from "fs";
import path from "path";

async function applyMigration() {
  const client = await pool.connect();
  try {
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), "migrations/0003_add_resume_path.sql"),
      "utf-8"
    );
    
    console.log("Applying migration: 0003_add_resume_path.sql");
    await client.query(migrationSQL);
    console.log("Migration applied successfully!");
  } catch (error) {
    console.error("Error applying migration:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
