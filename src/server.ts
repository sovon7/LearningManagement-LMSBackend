import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './app/config/db';
import { initializeCourseIds } from './app/common/modules/courseIds';
import { initializeQuizIds } from './app/common/modules/quizIds';

dotenv.config();

const port = Number(process.env.PORT || 5000);

const startServer = async () => {
  await connectDB();
  await initializeCourseIds();
  await initializeQuizIds();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};

startServer();
