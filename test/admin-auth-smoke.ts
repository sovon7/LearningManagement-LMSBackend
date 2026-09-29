import { requireRole, verifyToken } from '../src/app/common/middleware/auth.middleware';

const token = 'dummy-token';
const payload = verifyToken(token);
if (payload?.role !== 'admin') {
  throw new Error('admin role auth contract failed');
}

const next = () => {};
const req = { headers: { authorization: 'Bearer dummy-token' } } as any;
const res = { status: (code: number) => ({ json: () => ({ code }) }) } as any;
requireRole('admin')(req, res, next);
