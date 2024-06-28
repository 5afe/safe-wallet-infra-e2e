import { configuration } from '@/config/configuration';
import { ClientGatewayClient } from '@/datasources/cgw/cgw-client';
import { Wallet, ethers } from 'ethers';

let signer: Wallet;

const { privateKeys, walletAddresses } = configuration;

describe('CGW Auth tests', () => {
  const cgw: ClientGatewayClient = new ClientGatewayClient();

  beforeAll(async () => {
    const { chain, rpc } = configuration;
    const provider = new ethers.AlchemyProvider(chain.name, rpc.apiKey);
    signer = new ethers.Wallet(privateKeys[0], provider);
  });

  describe('auth endpoints', () => {
    it('should get a nonce', async () => {
      const data = await cgw.getNonce();
      expect(data).toMatchObject({ nonce: expect.any(String) });
    });

    it('should get a nonce and login using a SIWE message signed with the nonce', async () => {
      const { nonce } = await cgw.getNonce();
      const message = cgw.createSiweMessage(walletAddresses[0], nonce);

      const accessToken = await cgw.login({
        message,
        signature: await signer.signMessage(message),
      });

      expect(accessToken).toBeDefined();
    });
  });
});
