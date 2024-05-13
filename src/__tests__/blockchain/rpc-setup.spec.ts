import { Block, InfuraProvider } from 'ethers';
import { configuration } from '@/config/configuration';

describe('Blockchain read-only', () => {
  const { chain, rpc } = configuration;
  const provider = new InfuraProvider(chain.name, rpc.apiKey);

  it('should get the last block', async () => {
    const block: Block | null = await provider.getBlock('latest');

    expect(block).toMatchObject({
      hash: expect.any(String),
      number: expect.any(Number),
      timestamp: expect.any(Number),
      transactions: expect.arrayContaining([]),
    });
  });
});
