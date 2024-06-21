import { retry } from '@/__tests__/test-utils';
import { configuration } from '@/config/configuration';
import {
  CGWProposeTransactionDTO,
  ClientGatewayClient,
} from '@/datasources/cgw/cgw-client';
import { containsTransaction } from '@/datasources/cgw/cgw-utils';
import { SafeType } from '@/domain/safes/entities/safe-type';
import { SafesRepository } from '@/domain/safes/safes-repository';
import { faker } from '@faker-js/faker';
import SafeApiKit from '@safe-global/api-kit';
import Safe from '@safe-global/protocol-kit';
import { MetaTransactionData } from '@safe-global/safe-core-sdk-types';
import { Wallet, ethers } from 'ethers';

let eoaSigner: Wallet;
let primarySafeSdkInstance: Safe;
let primarySafeSecondSdkInstance: Safe;
let secondarySafeSdkInstance: Safe;
let cgw: ClientGatewayClient;
let apiKit: SafeApiKit;

const { privateKeys, transactionService } = configuration;

beforeAll(async () => {
  apiKit = new SafeApiKit({
    chainId: BigInt(1),
    txServiceUrl: transactionService.baseUri,
  });
  const { chain, rpc } = configuration;
  const provider = new ethers.InfuraProvider(chain.name, rpc.apiKey);

  eoaSigner = new ethers.Wallet(privateKeys[0], provider);
  primarySafeSdkInstance = await new SafesRepository(
    privateKeys[0],
  ).getSdkInstance(SafeType.PRIMARY);
  primarySafeSecondSdkInstance = await new SafesRepository(
    privateKeys[1],
  ).getSdkInstance(SafeType.PRIMARY);
  secondarySafeSdkInstance = await new SafesRepository(
    privateKeys[0],
  ).getSdkInstance(SafeType.SECONDARY);
  cgw = new ClientGatewayClient();
});

describe.skip('Transfers: receive/send native coins between Safes', () => {
  it('should send ether from a Safe to another', async () => {
    const amount = ethers.parseUnits(
      faker.number
        .float({ min: 0.00001, max: 0.0001, fractionDigits: 12 })
        .toString(),
      'ether',
    );
    const txData: MetaTransactionData = {
      to: await secondarySafeSdkInstance.getAddress(),
      data: '0x',
      value: amount.toString(),
    };
    const tx = await primarySafeSdkInstance.createTransaction({
      transactions: [txData],
    });
    const safeTxHash = await primarySafeSdkInstance.getTransactionHash(tx);
    const firstSignature =
      await primarySafeSdkInstance.signTransactionHash(safeTxHash);
    const safeAddress = await primarySafeSdkInstance.getAddress();
    const sender = await eoaSigner.getAddress();
    const { recommendedNonce } = await cgw.getNonces(safeAddress);
    const proposeTransactionDto: CGWProposeTransactionDTO = {
      to: tx.data.to,
      value: tx.data.value,
      data: tx.data.data,
      nonce: recommendedNonce.toString(),
      operation: tx.data.operation,
      safeTxGas: tx.data.safeTxGas,
      baseGas: tx.data.baseGas,
      gasPrice: tx.data.gasPrice,
      gasToken: tx.data.gasToken,
      refundReceiver: tx.data.refundReceiver,
      safeTxHash: safeTxHash,
      sender: sender,
      signature: firstSignature.data,
    };

    await cgw.postTransaction(safeAddress, proposeTransactionDto);

    // Check the CGW queue contains the transaction
    await retry(async () => {
      const queueBeforeDeletion = await cgw.getQueue(safeAddress);
      expect(containsTransaction(queueBeforeDeletion, safeTxHash)).toBe(true);
    });

    // Add a second signature
    const secondSignature =
      await primarySafeSecondSdkInstance.signTransactionHash(safeTxHash);
    await cgw.postConfirmation(safeTxHash, secondSignature);

    // Execute the transaction
    const safeTransaction = await apiKit.getTransaction(safeTxHash);
    const executeTxResponse =
      await primarySafeSdkInstance.executeTransaction(safeTransaction);
    await executeTxResponse.transactionResponse?.wait();

    // Check the CGW history contains the transaction
    await retry(async () => {
      const historyTxs = await cgw.getHistory(safeAddress);
      expect(containsTransaction(historyTxs, safeTxHash)).toBe(true);
    });

    // Check the CGW queue does not contain the transaction anymore
    const queueAfterExecution = await cgw.getQueue(safeAddress);
    expect(containsTransaction(queueAfterExecution, safeTxHash)).toBe(false);
  });
});
