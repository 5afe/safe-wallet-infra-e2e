import { configuration } from '@/config/configuration';
import { ClientGatewayClient, SiweMessage } from '@/datasources/cgw/cgw-client';
import { SafeType } from '@/domain/safes/entities/safe-type';
import { SafesRepository } from '@/domain/safes/safes-repository';
import { faker } from '@faker-js/faker';
import Safe from '@safe-global/protocol-kit';
import { Wallet, ethers } from 'ethers';

let signer: Wallet;
let primarySafeSdkInstance: Safe;

const { privateKeys, walletAddresses } = configuration;

describe('CGW Auth tests', () => {
  const cgw: ClientGatewayClient = new ClientGatewayClient();

  beforeAll(async () => {
    const { chain, rpc } = configuration;
    const provider = new ethers.InfuraProvider(chain.name, rpc.apiKey);
    signer = new ethers.Wallet(privateKeys[0], provider);
    primarySafeSdkInstance = await new SafesRepository(
      privateKeys[0],
    ).getSdkInstance(SafeType.PRIMARY);
  });

  describe('auth endpoints', () => {
    it('should get a nonce', async () => {
      const data = await cgw.getNonce();
      expect(data).toMatchObject({ nonce: expect.any(String) });
    });

    it('should get a nonce and accept the SIWE message signed with the nonce', async () => {
      const { nonce } = await cgw.getNonce();
      expect(nonce).toBeDefined();
      const safeAddress = await primarySafeSdkInstance.getAddress();
      expect(safeAddress).toBeDefined();
      const message: SiweMessage = {
        scheme: faker.internet.protocol(),
        domain: faker.internet.domainName(),
        address: safeAddress,
        statement: faker.lorem.sentence(),
        uri: faker.internet.url({ appendSlash: false }),
        version: '1',
        chainId: faker.number.int({ min: 1 }),
        nonce: nonce,
        issuedAt: new Date(),
        expirationTime: new Date(Date.now() + 1000 * 60 * 60),
        notBefore: new Date(Date.now() - 1000 * 60 * 60),
        requestId: faker.string.uuid(),
        resources: ['account'],
      };

      await cgw.login({ message: JSON.stringify(message), signature: 'bar' });
    });
  });
});
