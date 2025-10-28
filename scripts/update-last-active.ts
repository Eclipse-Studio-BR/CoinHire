import { pool } from "../server/db";

async function updateLastActive() {
  try {
    console.log("Updating last_active_at for existing users...");
    
    const usersResult = await pool.query("UPDATE users SET last_active_at = NOW()");
    console.log(`Updated ${usersResult.rowCount} users`);
    
    const profilesResult = await pool.query("UPDATE talent_profiles SET last_active_at = NOW()");
    console.log(`Updated ${profilesResult.rowCount} talent profiles`);
    
    console.log("✓ Successfully updated last_active_at timestamps");
    process.exit(0);
  } catch (error) {
    console.error("Error updating last_active_at:", error);
    process.exit(1);
  }
}

updateLastActive();
