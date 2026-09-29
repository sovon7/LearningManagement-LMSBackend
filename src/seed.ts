import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from './app/config/db';
import { User } from './app/common/modules/User';

dotenv.config();

const seedUsers = async () => {
  await connectDB();

  const users = [
    {
      name: 'System Admin',
      email: 'admin@lms.com',
      password: 'Admin@123',
      role: 'ADMIN'
    },
    {
      name: 'Demo Candidate',
      email: 'candidate@lms.com',
      password: 'Candidate@123',
      role: 'CANDIDATE'
    }
  ];

  for (const user of users) {
    const existingUser = await User.findOne({ email: user.email.toLowerCase() });

    if (existingUser) {
      console.log(`User already exists: ${user.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    const createdUser = await User.create({
      name: user.name,
      email: user.email.toLowerCase(),
      password: hashedPassword,
      role: user.role
    });

    console.log(`Created user: ${createdUser.email} | Role: ${createdUser.role}`);
  }

  console.log('Seed completed.');
  process.exit(0);
};

seedUsers().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
