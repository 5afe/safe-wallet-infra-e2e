import { Block, ethers } from 'ethers';
import { configuration } from '@/config/configuration';

describe('Blockchain read-only', () => {
  const provider = new ethers.InfuraProvider(
    configuration.chain.name,
    process.env.INFURA_API_KEY,
  );

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
