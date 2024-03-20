import { seconds } from '@/__tests__/test-utils';
import { configuration } from '@/config/configuration';
import {
  CGWDeleteTransactionDTO,
  CGWProposeTransactionDTO,
  ClientGatewayClient,
} from '@/datasources/cgw/cgw-client';
import { containsTransaction } from '@/datasources/cgw/cgw-utils';
import { SafesRepository } from '@/domain/safes/safes-repository';
import { faker } from '@faker-js/faker';
import SafeApiKit from '@safe-global/api-kit';
import Safe from '@safe-global/protocol-kit';
import { MetaTransactionData } from '@safe-global/safe-core-sdk-types';
import { TransactionResponse, Wallet, ethers } from 'ethers';

let eoaSigner: Wallet;
let sdkInstance: Safe;
let secondSdkInstance: Safe;
let cgw: ClientGatewayClient;
let apiKit: SafeApiKit;

const { privateKeys, transactionService } = configuration;

beforeAll(async () => {
  apiKit = new SafeApiKit({
    chainId: BigInt(1),
    txServiceUrl: transactionService.baseUri,
  });
  eoaSigner = new ethers.Wallet(
    privateKeys[0],
    new ethers.InfuraProvider('sepolia', process.env.INFURA_API_KEY),
  );

  sdkInstance = await new SafesRepository(privateKeys[0]).getSdkInstance();
  secondSdkInstance = await new SafesRepository(
    privateKeys[1],
  ).getSdkInstance();
  cgw = new ClientGatewayClient();
});

describe('Transactions cleanup', () => {
  it('should execute pending transactions', async () => {
    const safeAddress = await sdkInstance.getAddress();
    const pending = await apiKit.getPendingTransactions(safeAddress);
    for (const tx of pending.results) {
      const signature = await sdkInstance.signTransactionHash(tx.safeTxHash);
      const signature2 = await secondSdkInstance.signTransactionHash(
        tx.safeTxHash,
      );
      await apiKit.confirmTransaction(tx.safeTxHash, signature.data);
      await apiKit.confirmTransaction(tx.safeTxHash, signature2.data);
      const safeTransaction = await apiKit.getTransaction(tx.safeTxHash);
      const executeTxResponse =
        await sdkInstance.executeTransaction(safeTransaction);
      await executeTxResponse.transactionResponse?.wait();

      // Check the CGW history contains the transaction
      await seconds(30);
      const historyTxs = await cgw.getHistory(safeAddress);
      expect(containsTransaction(historyTxs, tx.safeTxHash)).toBe(true);
    }
  }, 120_000);
});

describe('Transfers: receive/send native coins from/to EOA', () => {
  it('should receive an ether transfer and check it is on the CGW history', async () => {
    const safeAddress = await sdkInstance.getAddress();
    const safeBalance = await sdkInstance.getBalance();
    const amount = ethers.parseUnits('0.0001', 'ether');

    const tx: TransactionResponse = await eoaSigner.sendTransaction({
      to: safeAddress,
      value: amount,
    });
    await seconds(30);

    const historyTxs = await cgw.getHistory(safeAddress);
    const newBalance = await sdkInstance.getBalance();
    expect(containsTransaction(historyTxs, tx.hash)).toBe(true);
    expect(newBalance).toEqual(safeBalance + amount);
  });

  it.skip('should propose an ether transfer, check queue, and delete the proposed transaction', async () => {
    const amount = ethers.parseUnits(
      faker.number
        .float({ min: 0.00001, max: 0.0001, fractionDigits: 12 })
        .toString(),
      'ether',
    );
    const txData: MetaTransactionData = {
      to: configuration.walletAddresses[1],
      data: '0x',
      value: amount.toString(),
    };
    const tx = await sdkInstance.createTransaction({
      transactions: [txData],
    });
    const safeTxHash = await sdkInstance.getTransactionHash(tx);
    const signature = await sdkInstance.signTransactionHash(safeTxHash);
    const safeAddress = await sdkInstance.getAddress();
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
      signature: signature.data,
    };

    await cgw.postTransaction(safeAddress, proposeTransactionDto);

    // Check the CGW queue contains the transaction
    await seconds(30);
    const queueBeforeDeletion = await cgw.getQueue(safeAddress);
    expect(containsTransaction(queueBeforeDeletion, safeTxHash)).toBe(true);

    // Delete the proposed transaction
    const deleteTransactionDto: CGWDeleteTransactionDTO = {
      signature: 'TODO', // TODO: deletion EIP712 data representation should be signed. (see TX service docs)
    };
    await cgw.deleteTransaction(safeTxHash, deleteTransactionDto);
    const queueAfterDeletion = await cgw.getQueue(safeAddress);
    expect(containsTransaction(queueAfterDeletion, safeTxHash)).toBe(false);
    const history = await cgw.getHistory(safeAddress);
    expect(containsTransaction(history, safeTxHash)).toBe(false);
  });

  it('should propose an ether transfer, check queue, sign, execute, and check history', async () => {
    const amount = ethers.parseUnits(
      faker.number
        .float({ min: 0.00001, max: 0.0001, fractionDigits: 12 })
        .toString(),
      'ether',
    );
    const txData: MetaTransactionData = {
      to: configuration.walletAddresses[1],
      data: '0x',
      value: amount.toString(),
    };
    const tx = await sdkInstance.createTransaction({
      transactions: [txData],
    });
    const safeTxHash = await sdkInstance.getTransactionHash(tx);
    const firstSignature = await sdkInstance.signTransactionHash(safeTxHash);
    const safeAddress = await sdkInstance.getAddress();
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
    await seconds(30);
    const queueBeforeExecution = await cgw.getQueue(safeAddress);
    expect(containsTransaction(queueBeforeExecution, safeTxHash)).toBe(true);

    // Add a second signature
    const secondSignature =
      await secondSdkInstance.signTransactionHash(safeTxHash);
    await cgw.postConfirmation(safeTxHash, secondSignature);

    // Execute the transaction
    const safeTransaction = await apiKit.getTransaction(safeTxHash);
    const executeTxResponse =
      await sdkInstance.executeTransaction(safeTransaction);
    await executeTxResponse.transactionResponse?.wait();

    // Check the CGW history contains the transaction
    await seconds(30);
    const historyTxs = await cgw.getHistory(safeAddress);
    expect(containsTransaction(historyTxs, safeTxHash)).toBe(true);

    // Check the CGW queue does not contain the transaction anymore
    const queueAfterExecution = await cgw.getQueue(safeAddress);
    expect(containsTransaction(queueAfterExecution, safeTxHash)).toBe(false);
  });
});
