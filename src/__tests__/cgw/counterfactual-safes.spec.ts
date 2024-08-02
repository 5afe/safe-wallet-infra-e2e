import { configuration } from '@/config/configuration';
import {
  CGWAccount,
  CGWCounterfactualSafe,
  ClientGatewayClient,
} from '@/datasources/cgw/cgw-client';
import { faker } from '@faker-js/faker';
import { ethers, Wallet } from 'ethers';

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

describe('CGW Counterfactual Safes tests', () => {
  const cgw: ClientGatewayClient = new ClientGatewayClient();

  beforeAll(async () => {
    const { chain, rpc } = configuration;
    const provider = new ethers.AlchemyProvider(chain.name, rpc.apiKey);
    signer = new ethers.Wallet(privateKeys[0], provider);
    accessToken = await getAccessToken(cgw);
  });

  let createdAccount: CGWAccount;
  let created: CGWCounterfactualSafe;

  describe('counterfactual safes endpoints', () => {
    it('should create a counterfactual safe, get it, and delete it', async () => {
      const createAccountDto = { address: walletAddresses[0] };
      const { address } = createAccountDto;
      const predictedAddress = faker.finance.ethereumAddress();
      const createCounterfactualSafeDto = {
        chainId: configuration.chain.chainId,
        fallbackHandler: faker.finance.ethereumAddress(),
        owners: [walletAddresses[0]],
        predictedAddress,
        saltNonce: '1',
        singletonAddress: faker.finance.ethereumAddress(),
        threshold: faker.number.int({ min: 1, max: 10 }),
      };

      try {
        createdAccount = await cgw.createAccount(accessToken, createAccountDto);
        expect(createdAccount).toBeDefined();
        expect(createdAccount.address).toBe(address);
        const account = await cgw.getAccount(
          accessToken,
          createdAccount.address,
        );
        expect(account.address).toBe(createdAccount.address);
        expect(account.id).toBe(createdAccount.id);

        // Enable setting for all data types
        const dataTypes = await cgw.getDataTypes();
        const upsertAccountDataSettingsDto = {
          accountDataSettings: dataTypes
            .filter((dt) => dt.isActive)
            .map((dt) => ({
              dataTypeId: dt.id,
              enabled: true,
            })),
        };

        await cgw.upsertAccountDataSettings(
          accessToken,
          address,
          upsertAccountDataSettingsDto,
        );

        created = await cgw.createCounterfactualSafe(
          accessToken,
          address,
          createCounterfactualSafeDto,
        );
        expect(created).toBeDefined();
        expect(created.creator).toBe(address);
        const counterfactualSafe = await cgw.getCounterfactualSafe(
          accessToken,
          created.creator,
          created.chainId,
          created.predictedAddress,
        );
        expect(counterfactualSafe).toStrictEqual(created);
      } finally {
        await cgw.deleteAccount(accessToken, address);
        // await cgw.deleteCounterfactualSafe(accessToken, address);
        // TODO: Implement deletion of counterfactual safe
      }

      // TODO: check 404 returned after deletion
      // await expect(
      //   cgw.getCounterfactualSafe(accessToken, address),
      // ).rejects.toThrow('Request failed with status code 404');
    });
  });
});
