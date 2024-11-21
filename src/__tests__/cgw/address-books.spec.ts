import { configuration } from '@/config/configuration';
import { CGWAccount, ClientGatewayClient } from '@/datasources/cgw/cgw-client';
import { faker } from '@faker-js/faker';
import { ethers, getAddress, Wallet } from 'ethers';

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

describe('CGW Address Books tests', () => {
  const cgw: ClientGatewayClient = new ClientGatewayClient();

  beforeAll(async () => {
    const { chain, rpc } = configuration;
    const provider = new ethers.AlchemyProvider(chain.name, rpc.apiKey);
    signer = new ethers.Wallet(privateKeys[0], provider);
    accessToken = await getAccessToken(cgw);
  });

  let createdAccount: CGWAccount;

  describe('Address Books endpoints', () => {
    it('should create an Account, and fail to get its Address Book', async () => {
      const address = walletAddresses[0];
      const name = 'TestAccount';
      const chainId = configuration.chain.chainId;
      const createAccountDto = { address, name };
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
        expect(account.name).toBe(createdAccount.name);

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

        await cgw.getAddressBook(accessToken, address, chainId);
      } catch (error) {
        expect(error.response.data).toBe('Address Book not found');
        expect(error.response.status).toBe(404);
      } finally {
        await cgw.deleteAccount(accessToken, address);
      }
    });

    it('should create an Account, create an AddressBookItem and retrieve the AddressBook', async () => {
      const address = walletAddresses[0];
      const name = 'TestAccount';
      const chainId = configuration.chain.chainId;
      const createAccountDto = { address, name };
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
        expect(account.name).toBe(createdAccount.name);

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

        const createAddressBookItemDto = {
          name: 'TestAddressBookItem',
          address: faker.finance.ethereumAddress(),
        };
        const secondCreateAddressBookItemDto = {
          name: 'SecondTestAddressBookItem',
          address: faker.finance.ethereumAddress(),
        };
        const item = await cgw.createAddressBookItem(
          accessToken,
          address,
          chainId,
          createAddressBookItemDto,
        );
        const secondItem = await cgw.createAddressBookItem(
          accessToken,
          address,
          chainId,
          secondCreateAddressBookItemDto,
        );
        expect(item).toStrictEqual({
          id: expect.any(String),
          name: createAddressBookItemDto.name,
          address: getAddress(createAddressBookItemDto.address), // should be checksummed by the CGW
        });
        expect(secondItem).toStrictEqual({
          id: expect.any(String),
          name: secondCreateAddressBookItemDto.name,
          address: getAddress(secondCreateAddressBookItemDto.address), // should be checksummed by the CGW
        });
        const addressBook = await cgw.getAddressBook(
          accessToken,
          address,
          chainId,
        );
        expect(addressBook).toStrictEqual({
          id: expect.any(String),
          accountId: account.id,
          chainId,
          data: [
            {
              id: '1',
              name: 'TestAddressBookItem',
              address: getAddress(createAddressBookItemDto.address), // should be checksummed by the CGW
            },
            {
              id: '2',
              name: 'SecondTestAddressBookItem',
              address: getAddress(secondCreateAddressBookItemDto.address), // should be checksummed by the CGW
            },
          ],
        });
      } finally {
        await cgw.deleteAccount(accessToken, address);
      }
    });
  });
});
