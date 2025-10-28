import { db } from './server/db.js';
import { messages, applications } from './shared/schema.js';

async function checkMessages() {
  try {
    console.log('\n=== Checking Messages Table ===\n');
    
    // List all messages
    const allMessages = await db.select().from(messages);
    console.log('Total messages in database:', allMessages.length);
    
    if (allMessages.length > 0) {
      console.log('\nMessages:');
      allMessages.forEach(msg => {
        console.log({
          id: msg.id,
          applicationId: msg.applicationId,
          senderId: msg.senderId,
          message: msg.message.substring(0, 50) + '...',
          createdAt: msg.createdAt
        });
      });
    }
    
    // List all applications
    console.log('\n=== Applications ===\n');
    const allApplications = await db.select().from(applications);
    console.log('Total applications:', allApplications.length);
    
    if (allApplications.length > 0) {
      console.log('\nApplications:');
      allApplications.forEach(app => {
        console.log({
          id: app.id,
          userId: app.userId,
          jobId: app.jobId,
          status: app.status
        });
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMessages();
