import { configuration } from '@/config/configuration';
import { CGWAccount, ClientGatewayClient } from '@/datasources/cgw/cgw-client';
import { Wallet, ethers } from 'ethers';

let signer: Wallet;
let accessToken: string;

const { privateKeys, walletAddresses } = configuration;

const getAccessToken = async (cgw: ClientGatewayClient) => {
  const { nonce } = await cgw.getNonce();
  const message = cgw.createSiweMessage(walletAddresses[0], nonce);

  const accessToken = await cgw.login({
    message,
    signature: await signer.signMessage(message),
  });

  if (accessToken === undefined) {
    throw new Error('Access token is undefined');
  }

  return accessToken;
};

describe('CGW Auth tests', () => {
  const cgw: ClientGatewayClient = new ClientGatewayClient();

  beforeAll(async () => {
    const { chain, rpc } = configuration;
    const provider = new ethers.AlchemyProvider(chain.name, rpc.apiKey);
    signer = new ethers.Wallet(privateKeys[0], provider);
    accessToken = await getAccessToken(cgw);
  });

  let account: CGWAccount;

  describe('auth endpoints', () => {
    it('should create an account', async () => {
      const createAccountDto = {
        address: walletAddresses[0],
      };

      account = await cgw.createAccount(accessToken, createAccountDto);

      expect(account).toBeDefined();
    });

    it('should delete an account', async () => {
      await cgw.deleteAccount(accessToken, account.address);
    });
  });
});
