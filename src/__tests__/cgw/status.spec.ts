import { expect } from '@jest/globals';
import { ClientGatewayClient } from '@/datasources/cgw/cgw-client';
import '@/__tests__/matchers/to-be-string-or-null';

describe('CGW status checks', () => {
  const cgw: ClientGatewayClient = new ClientGatewayClient();

  describe('/health endpoints', () => {
    it('should return OK to liveness probe', async () => {
      const data = await cgw.getLiveness();
      expect(data).toEqual({ status: 'OK' });
    });

    it('should return OK to readiness probe', async () => {
      const data = await cgw.getReadiness();
      expect(data).toEqual({ status: 'OK' });
    });
  });

  describe('/about endpoint', () => {
    it('should return the service metadata', async () => {
      const data = await cgw.getAbout();
      expect(data).toMatchObject({
        name: expect.any(String),
        version: expect.anyStringOrNull(),
        buildNumber: expect.anyStringOrNull(),
      });
    });
  });
});
