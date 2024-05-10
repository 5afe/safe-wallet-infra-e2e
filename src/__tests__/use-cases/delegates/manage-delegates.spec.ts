import { configuration } from '@/config/configuration';
import {
  CGWCreateDelegateDTO,
  CGWDeleteDelegateDTO,
  ClientGatewayClient,
} from '@/datasources/cgw/cgw-client';
import { SafeType } from '@/domain/safes/entities/safe-type';
import { SafesRepository } from '@/domain/safes/safes-repository';
import Safe from '@safe-global/protocol-kit';
import { Wallet, ethers } from 'ethers';

let eoaSigner: Wallet;
let primarySafeSdkInstance: Safe;
let cgw: ClientGatewayClient;

const { privateKeys, walletAddresses } = configuration;
const SEPOLIA_CHAIN_ID = '11155111';

beforeAll(async () => {
  cgw = new ClientGatewayClient();
  eoaSigner = new ethers.Wallet(
    privateKeys[0],
    new ethers.InfuraProvider('sepolia', process.env.INFURA_API_KEY),
  );
  primarySafeSdkInstance = await new SafesRepository(
    privateKeys[0],
  ).getSdkInstance(SafeType.PRIMARY);
});

describe('Delegates: list/create/delete Safe delegates', () => {
  it('create a delegate for a given Safe', async () => {
    const safeAddress = await primarySafeSdkInstance.getAddress();
    const createDelegateDto: CGWCreateDelegateDTO = {
      chainId: SEPOLIA_CHAIN_ID,
      delegate: walletAddresses[1],
      delegator: walletAddresses[0],
      safe: safeAddress,
      signature: await buildSignature(walletAddresses[1]),
      label: `Test Delegate ${Date.now()}`,
    };

    const delegatesBefore = await cgw.getDelegates({
      chainId: SEPOLIA_CHAIN_ID,
      delegator: walletAddresses[0],
    });

    expect(delegatesBefore).toEqual(
      expect.not.arrayContaining([
        {
          safe: safeAddress,
          delegator: walletAddresses[0],
          delegate: walletAddresses[1],
          label: createDelegateDto.label,
        },
      ]),
    );

    await cgw.createDelegate(createDelegateDto);

    const delegatesAfter = await cgw.getDelegates({
      chainId: SEPOLIA_CHAIN_ID,
      delegator: walletAddresses[0],
    });

    expect(delegatesAfter).toEqual(
      expect.arrayContaining([
        {
          safe: safeAddress,
          delegator: walletAddresses[0],
          delegate: walletAddresses[1],
          label: createDelegateDto.label,
        },
      ]),
    );
  });

  it('create delegate and delete it by delegator', async () => {
    const safeAddress = await primarySafeSdkInstance.getAddress();
    const createDelegateDto: CGWCreateDelegateDTO = {
      chainId: SEPOLIA_CHAIN_ID,
      delegate: walletAddresses[1],
      delegator: walletAddresses[0],
      safe: safeAddress,
      signature: await buildSignature(walletAddresses[1]),
      label: `Test Delegate ${Date.now()}`,
    };

    const delegatesBefore = await cgw.getDelegates({
      chainId: SEPOLIA_CHAIN_ID,
      delegator: walletAddresses[0],
    });

    expect(delegatesBefore).toEqual(
      expect.not.arrayContaining([
        {
          safe: safeAddress,
          delegator: walletAddresses[0],
          delegate: walletAddresses[1],
          label: createDelegateDto.label,
        },
      ]),
    );

    await cgw.createDelegate(createDelegateDto);

    const delegatesAfter = await cgw.getDelegates({
      chainId: SEPOLIA_CHAIN_ID,
      delegator: walletAddresses[0],
    });

    expect(delegatesAfter).toEqual(
      expect.arrayContaining([
        {
          safe: safeAddress,
          delegator: walletAddresses[0],
          delegate: walletAddresses[1],
          label: createDelegateDto.label,
        },
      ]),
    );

    const deleteDelegateDto: CGWDeleteDelegateDTO = {
      chainId: SEPOLIA_CHAIN_ID,
      delegate: walletAddresses[1],
      delegator: walletAddresses[0],
      signature: await buildSignature(walletAddresses[1]),
    };

    await cgw.deleteDelegate(deleteDelegateDto);

    expect(delegatesBefore).toEqual(
      expect.not.arrayContaining([
        {
          safe: safeAddress,
          delegator: walletAddresses[0],
          delegate: walletAddresses[1],
          label: createDelegateDto.label,
        },
      ]),
    );
  });

  it('create delegate and delete it by Safe address', async () => {
    const safeAddress = await primarySafeSdkInstance.getAddress();
    const createDelegateDto: CGWCreateDelegateDTO = {
      chainId: SEPOLIA_CHAIN_ID,
      delegate: walletAddresses[1],
      delegator: walletAddresses[0],
      safe: safeAddress,
      signature: await buildSignature(walletAddresses[1]),
      label: `Test Delegate ${Date.now()}`,
    };

    const delegatesBefore = await cgw.getDelegates({
      chainId: SEPOLIA_CHAIN_ID,
      delegator: walletAddresses[0],
    });

    expect(delegatesBefore).toEqual(
      expect.not.arrayContaining([
        {
          safe: safeAddress,
          delegator: walletAddresses[0],
          delegate: walletAddresses[1],
          label: createDelegateDto.label,
        },
      ]),
    );

    await cgw.createDelegate(createDelegateDto);

    const delegatesAfter = await cgw.getDelegates({
      chainId: SEPOLIA_CHAIN_ID,
      delegator: walletAddresses[0],
    });

    expect(delegatesAfter).toEqual(
      expect.arrayContaining([
        {
          safe: safeAddress,
          delegator: walletAddresses[0],
          delegate: walletAddresses[1],
          label: createDelegateDto.label,
        },
      ]),
    );

    const deleteDelegateDto: CGWDeleteDelegateDTO = {
      chainId: SEPOLIA_CHAIN_ID,
      delegate: walletAddresses[1],
      safe: safeAddress,
      signature: await buildSignature(walletAddresses[1]),
    };

    await cgw.deleteDelegate(deleteDelegateDto);

    expect(delegatesBefore).toEqual(
      expect.not.arrayContaining([
        {
          safe: safeAddress,
          delegator: walletAddresses[0],
          delegate: walletAddresses[1],
          label: createDelegateDto.label,
        },
      ]),
    );
  });
});

const buildSignature = async (
  delegateAddress: `0x${string}`,
): Promise<string> => {
  const domain = {
    name: 'Safe Transaction Service',
    version: '1.0',
    chainId: SEPOLIA_CHAIN_ID,
  };

  const types = {
    Delegate: [
      { name: 'delegateAddress', type: 'bytes32' },
      { name: 'totp', type: 'uint256' },
    ],
  };

  const message = {
    delegateAddress: ethers.zeroPadBytes(delegateAddress, 32),
    totp: getTotp(),
  };

  return eoaSigner.signTypedData(domain, types, message);
};

const getTotp = (): number => {
  return Math.floor(Date.now() / 1000 / 3600);
};
