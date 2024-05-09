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

export interface CGWCreateDelegateDTO {
  chainId: string;
  delegate: string;
  delegator: string;
  safe: string | null;
  signature: string;
  label: string;
}

export interface CGWDeleteDelegateDTO {
  chainId: string;
  delegate: string;
  delegator: string | null;
  safe: string | null;
  signature: string;
}

export interface CGWGetDelegateDTO {
  chainId: string;
  delegate: string | null;
  delegator: string | null;
  safe: string | null;
  label: string | null;
}

export interface CGWDelegate {
  safe: string;
  delegate: string;
  delegator: string;
  label: string;
}

// TODO: move 11155111 chain id to configuration.

export class ClientGatewayClient {
  private readonly baseUri: string;

  constructor() {
    this.baseUri = configuration.clientGateway.baseUri;
  }

  // Heath check endpoints

  async getLiveness(): Promise<{ status: string }> {
    const { data } = await httpClient.get(`${this.baseUri}/health/live`);
    return data;
  }

  async getReadiness(): Promise<{ status: string }> {
    const { data } = await httpClient.get(`${this.baseUri}/health/ready`);
    return data;
  }

  // About endpoints

  async getAbout(): Promise<{
    name: string;
    version: string | null;
    buildNumber: string | null;
  }> {
    const { data } = await httpClient.get(`${this.baseUri}/about`);
    return data;
  }

  // Transaction endpoints

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

  // Delegates endpoints

  async createDelegate(
    createDelegateDTO: CGWCreateDelegateDTO,
  ): Promise<CGWDelegate> {
    const url = `${this.baseUri}/v2/chains/11155111/delegates`;
    try {
      const { data } = await httpClient.post(url, createDelegateDTO);
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async deleteDelegate(deleteDelegateDTO: CGWDeleteDelegateDTO): Promise<void> {
    const url = `${this.baseUri}/v2/chains/11155111/delegates/${deleteDelegateDTO.delegate}`;
    await httpClient.delete(url, { data: deleteDelegateDTO });
  }

  async getDelegates(
    getDelegateDTO: CGWGetDelegateDTO,
  ): Promise<CGWDelegate[]> {
    const url = new URL(`${this.baseUri}/v2/chains/11155111/delegates`);
    const { safe, delegate, delegator, label } = getDelegateDTO;
    if (safe) url.searchParams.append('safe', safe);
    if (delegate) url.searchParams.append('delegate', delegate);
    if (delegator) url.searchParams.append('delegator', delegator);
    if (label) url.searchParams.append('label', label);

    const { data } = await httpClient.get(url.toString());
    return data.results;
  }
}
