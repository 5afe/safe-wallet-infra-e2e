import { configuration } from '@/config/configuration';
import { InfuraProvider, Wallet } from 'ethers';

describe('Wallet actions', () => {
  const { chain, rpc } = configuration;
  const provider = new InfuraProvider(chain.name, rpc.apiKey);
  const wallets = configuration.privateKeys.map(
    (pk) => new Wallet(pk, provider),
  );

  it('should build wallets from the configured addresses', async () => {
    const [firstWallet, secondWallet, thirdWallet] = wallets;
    expect(firstWallet.address).toEqual(configuration.walletAddresses[0]);
    expect(secondWallet.address).toEqual(configuration.walletAddresses[1]);
    expect(thirdWallet.address).toEqual(configuration.walletAddresses[2]);
  });
});
