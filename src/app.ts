import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import adminRoutes from './app/modules/Admin/Route/admin.routes';
import candidateRoutes from './app/modules/Candidate/Route/candidate.routes';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'LMS Backend' });
});

app.use('/api/admin', adminRoutes);
app.use('/api/candidate', candidateRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

export default app;
