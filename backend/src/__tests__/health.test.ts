import request from 'supertest';
import { app } from '../app';

describe('Health Check Endpoint', () => {
  it('should return 200 and status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      message: 'AI Template Studio API is running',
      timestamp: expect.any(String)
    });
  });
});
