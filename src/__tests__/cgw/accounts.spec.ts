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

  let created: CGWAccount;

  describe('auth endpoints', () => {
    it('should create an account, get it, and delete it', async () => {
      const address = walletAddresses[0];
      const name = 'TestAccount';
      const createAccountDto = { address, name };

      try {
        created = await cgw.createAccount(accessToken, createAccountDto);
        expect(created).toBeDefined();
        expect(created.address).toBe(address);
        const account = await cgw.getAccount(accessToken, created.address);
        expect(account.address).toBe(created.address);
        expect(account.id).toBe(created.id);
        expect(account.name).toBe(created.name);
      } finally {
        await cgw.deleteAccount(accessToken, address);
      }

      await expect(cgw.getAccount(accessToken, address)).rejects.toThrow(
        'Request failed with status code 404',
      );
    });

    it('should fail to create an account if the name format is not correct', async () => {
      const address = walletAddresses[0];
      const name = 'Invalid Test Account that contains spaces';
      const createAccountDto = { address, name };

      await expect(
        cgw.createAccount(accessToken, createAccountDto),
      ).rejects.toThrow('Request failed with status code 422');
    });

    it('should fail to create an account if the name format is not correct (2)', async () => {
      const address = walletAddresses[0];
      const name = 'D'; // Name is too short
      const createAccountDto = { address, name };

      await expect(
        cgw.createAccount(accessToken, createAccountDto),
      ).rejects.toThrow('Request failed with status code 422');
    });

    it('should fail to create an account if the name format is not correct (2)', async () => {
      const address = walletAddresses[0];
      const name = 'D'.repeat(21); // Name is too long
      const createAccountDto = { address, name };

      await expect(
        cgw.createAccount(accessToken, createAccountDto),
      ).rejects.toThrow('Request failed with status code 422');
    });

    it('should get the available data types', async () => {
      const dataTypes = await cgw.getDataTypes();
      expect(dataTypes).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: 'CounterfactualSafes',
            description: expect.any(String),
            isActive: expect.any(Boolean),
          }),
          expect.objectContaining({
            id: expect.any(String),
            name: 'AddressBook',
            description: expect.any(String),
            isActive: expect.any(Boolean),
          }),
        ]),
      );
    });

    it('should create an account, set its data settings twice, get them, and delete the account', async () => {
      const address = walletAddresses[0];
      const name = 'TestAccount';
      const createAccountDto = { address, name };

      try {
        created = await cgw.createAccount(accessToken, createAccountDto);
        expect(created).toBeDefined();
        expect(created.address).toBe(address);
        const account = await cgw.getAccount(accessToken, created.address);
        expect(account.address).toBe(created.address);
        expect(account.id).toBe(created.id);
        expect(account.name).toBe(created.name);
        const dataTypes = await cgw.getDataTypes();
        const upsertAccountDataSettingsDto = {
          accountDataSettings: dataTypes
            .filter((dt) => dt.isActive)
            .map((dt) => ({
              dataTypeId: dt.id,
              enabled: true,
            })),
        };

        const actual = await cgw.upsertAccountDataSettings(
          accessToken,
          address,
          upsertAccountDataSettingsDto,
        );

        expect(actual).toStrictEqual(
          expect.arrayContaining(
            dataTypes
              .filter((dt) => dt.isActive)
              .map((dt) => ({
                dataTypeId: dt.id,
                enabled: true,
              })),
          ),
        );

        const anotherUpsertAccountDataSettingsDto = {
          accountDataSettings: dataTypes
            .filter((dt) => dt.isActive)
            .map((dt) => ({
              dataTypeId: dt.id,
              enabled: false,
            })),
        };

        const updated = await cgw.upsertAccountDataSettings(
          accessToken,
          address,
          anotherUpsertAccountDataSettingsDto,
        );

        expect(updated).toStrictEqual(
          expect.arrayContaining(
            dataTypes
              .filter((dt) => dt.isActive)
              .map((dt) => ({
                dataTypeId: dt.id,
                enabled: false,
              })),
          ),
        );

        const accountDataSettings = await cgw.getAccountDataSettings(
          accessToken,
          address,
        );

        expect(accountDataSettings).toStrictEqual(
          expect.arrayContaining(
            dataTypes
              .filter((dt) => dt.isActive)
              .map((dt) => ({
                dataTypeId: dt.id,
                enabled: false,
              })),
          ),
        );
      } finally {
        await cgw.deleteAccount(accessToken, address);
      }

      await expect(cgw.getAccount(accessToken, address)).rejects.toThrow(
        'Request failed with status code 404',
      );
    });
  });
});
