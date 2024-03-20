import { configuration } from '@/config/configuration';
import { httpClient } from '@/datasources/http/axios-http-client';
import { SafeSignature } from '@safe-global/safe-core-sdk-types';

export interface CGWTransactionItem {
  type: 'TRANSACTION';
  transaction: CGWTransaction;
}

export interface CGWTransaction {
  id: string;
  timestamp: number;
  txStatus: string;
  txInfo: Record<string, unknown>;
  executionInfo: { nonce: number };
  safeAppInfo: Record<string, unknown>;
}

export interface CGWProposeTransactionDTO {
  to: string;
  value: string;
  data?: string;
  nonce: string;
  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken?: string;
  refundReceiver?: string;
  safeTxHash: string;
  sender: string;
  signature?: string;
  origin?: string;
}

export interface CGWNoncesResponse {
  currentNonce: number;
  recommendedNonce: number;
}

export interface CGWDeleteTransactionDTO {
  signature: string;
}

// TODO: move 11155111 chain id to configuration.

export class ClientGatewayClient {
  private readonly baseUri: string;

  constructor() {
    this.baseUri = configuration.clientGateway.baseUri;
  }

  async getLiveness(): Promise<{ status: string }> {
    const { data } = await httpClient.get(`${this.baseUri}/health/live`);
    return data;
  }

  async getReadiness(): Promise<{ status: string }> {
    const { data } = await httpClient.get(`${this.baseUri}/health/ready`);
    return data;
  }

  async getAbout(): Promise<{
    name: string;
    version: string | null;
    buildNumber: string | null;
  }> {
    const { data } = await httpClient.get(`${this.baseUri}/about`);
    return data;
  }

  async getHistory(safeAddress: string): Promise<CGWTransactionItem[]> {
    const { data } = await httpClient.get(
      `${this.baseUri}/v1/chains/11155111/safes/${safeAddress}/transactions/history`,
    );
    return data.results.filter((i) => i.type === 'TRANSACTION');
  }

  async getNonces(safeAddress: string): Promise<CGWNoncesResponse> {
    const { data } = await httpClient.get(
      `${this.baseUri}/v1/chains/11155111/safes/${safeAddress}/nonces`,
    );
    return data;
  }

  async getQueue(safeAddress: string): Promise<CGWTransactionItem[]> {
    const { data } = await httpClient.get(
      `${this.baseUri}/v1/chains/11155111/safes/${safeAddress}/transactions/queued`,
    );
    return data.results.filter((i) => i.type === 'TRANSACTION');
  }

  async postConfirmation(
    safeTxHash: string,
    signature: SafeSignature,
  ): Promise<CGWTransaction> {
    try {
      const { data } = await httpClient.post(
        `${this.baseUri}/v1/chains/11155111/transactions/${safeTxHash}/confirmations`,
        { signedSafeTxHash: signature.data },
      );
      return data;
    } catch (err) {
      throw err;
    }
  }

  async postTransaction(
    safeAddress: string,
    proposeTransactionDto: CGWProposeTransactionDTO,
  ): Promise<CGWTransaction> {
    const { data } = await httpClient.post(
      `${this.baseUri}/v1/chains/11155111/transactions/${safeAddress}/propose`,
      proposeTransactionDto,
    );
    return data;
  }

  async deleteTransaction(
    safeTxHash: string,
    deleteTransactionDto: CGWDeleteTransactionDTO,
  ): Promise<void> {
    await httpClient.delete(
      `${this.baseUri}/v1/chains/11155111/transactions/${safeTxHash}`,
      { data: deleteTransactionDto },
    );
  }
}
