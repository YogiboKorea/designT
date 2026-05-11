import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { hashPassword } from '../src/lib/hash';
import AdminUser from '../src/models/AdminUser';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const adminId = process.env.ADMIN_ID || 'yogico';
    const adminPw = process.env.ADMIN_PASSWORD || 'yogico';

    const existingUser = await AdminUser.findOne({ username: adminId });
    if (existingUser) {
      console.log(`Admin user '${adminId}' already exists.`);
    } else {
      const passwordHash = hashPassword(adminPw);
      await AdminUser.create({
        username: adminId,
        passwordHash,
      });
      console.log(`Created admin user '${adminId}' successfully.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
