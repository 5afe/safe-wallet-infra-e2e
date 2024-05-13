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

let signer: Wallet;
let primarySafeSdkInstance: Safe;
let cgw: ClientGatewayClient;

const { privateKeys, walletAddresses } = configuration;

beforeAll(async () => {
  cgw = new ClientGatewayClient();
  const { chain, rpc } = configuration;
  const provider = new ethers.InfuraProvider(chain.name, rpc.apiKey);
  signer = new ethers.Wallet(privateKeys[0], provider);
  primarySafeSdkInstance = await new SafesRepository(
    privateKeys[0],
  ).getSdkInstance(SafeType.PRIMARY);
});

describe('Delegates: list/create/delete Safe delegates', () => {
  it('create a delegate for a given Safe', async () => {
    const { chainId } = configuration.chain;
    const safeAddress = await primarySafeSdkInstance.getAddress();
    const createDelegateDto: CGWCreateDelegateDTO = {
      chainId,
      delegate: walletAddresses[1],
      delegator: walletAddresses[0],
      safe: safeAddress,
      signature: await buildSignature(walletAddresses[1]),
      label: `Test Delegate ${Date.now()}`,
    };

    const delegatesBefore = await cgw.getDelegates({
      chainId,
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
      chainId,
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
    const { chainId } = configuration.chain;
    const safeAddress = await primarySafeSdkInstance.getAddress();
    const createDelegateDto: CGWCreateDelegateDTO = {
      chainId,
      delegate: walletAddresses[1],
      delegator: walletAddresses[0],
      safe: safeAddress,
      signature: await buildSignature(walletAddresses[1]),
      label: `Test Delegate ${Date.now()}`,
    };

    const delegatesBefore = await cgw.getDelegates({
      chainId,
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
      chainId,
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
      chainId,
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
    const { chainId } = configuration.chain;
    const safeAddress = await primarySafeSdkInstance.getAddress();
    const createDelegateDto: CGWCreateDelegateDTO = {
      chainId,
      delegate: walletAddresses[1],
      delegator: walletAddresses[0],
      safe: safeAddress,
      signature: await buildSignature(walletAddresses[1]),
      label: `Test Delegate ${Date.now()}`,
    };

    const delegatesBefore = await cgw.getDelegates({
      chainId,
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
      chainId,
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
      chainId,
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
  const { chainId } = configuration.chain;
  const domain = { name: 'Safe Transaction Service', version: '1.0', chainId };
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

  return signer.signTypedData(domain, types, message);
};

const getTotp = (): number => {
  return Math.floor(Date.now() / 1000 / 3600);
};
