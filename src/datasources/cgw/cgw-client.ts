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
  safe?: string;
  signature: string;
  label: string;
}

export interface CGWDeleteDelegateDTO {
  chainId: string;
  delegate: string;
  delegator?: string;
  safe?: string;
  signature: string;
}

export interface CGWGetDelegateDTO {
  chainId: string;
  delegate?: string;
  delegator?: string;
  safe?: string;
  label?: string;
}

export interface CGWDelegate {
  safe: string;
  delegate: string;
  delegator: string;
  label: string;
}

export interface SiweDto {
  message: string;
  signature: string;
}

export interface SiweMessage {
  scheme: string;
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: Date;
  expirationTime: Date;
  notBefore: Date;
  requestId: string;
  resources: string[];
}

export class ClientGatewayClient {
  private readonly baseUri: string;
  private readonly chainId: string;

  constructor() {
    this.baseUri = configuration.clientGateway.baseUri;
    this.chainId = configuration.chain.chainId;
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

  // Auth endpoints

  async getNonce(): Promise<{ nonce: string }> {
    const { data } = await httpClient.get(`${this.baseUri}/v1/auth/nonce`);
    return data;
  }

  async login(siweDto: SiweDto): Promise<void> {
    try {
      const { data } = await httpClient.post(
        `${this.baseUri}/v1/auth/verify`,
        siweDto,
      );
      return data;
    } catch (err) {
      throw err;
    }
  }

  // Transaction endpoints

  async getHistory(safeAddress: string): Promise<CGWTransactionItem[]> {
    const { data } = await httpClient.get(
      `${this.baseUri}/v1/chains/${this.chainId}/safes/${safeAddress}/transactions/history`,
    );
    return data.results.filter((i) => i.type === 'TRANSACTION');
  }

  async getNonces(safeAddress: string): Promise<CGWNoncesResponse> {
    const { data } = await httpClient.get(
      `${this.baseUri}/v1/chains/${this.chainId}/safes/${safeAddress}/nonces`,
    );
    return data;
  }

  async getQueue(safeAddress: string): Promise<CGWTransactionItem[]> {
    const { data } = await httpClient.get(
      `${this.baseUri}/v1/chains/${this.chainId}/safes/${safeAddress}/transactions/queued`,
    );
    return data.results.filter((i) => i.type === 'TRANSACTION');
  }

  async postConfirmation(
    safeTxHash: string,
    signature: SafeSignature,
  ): Promise<CGWTransaction> {
    try {
      const { data } = await httpClient.post(
        `${this.baseUri}/v1/chains/${this.chainId}/transactions/${safeTxHash}/confirmations`,
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
      `${this.baseUri}/v1/chains/${this.chainId}/transactions/${safeAddress}/propose`,
      proposeTransactionDto,
    );
    return data;
  }

  async deleteTransaction(
    safeTxHash: string,
    deleteTransactionDto: CGWDeleteTransactionDTO,
  ): Promise<void> {
    await httpClient.delete(
      `${this.baseUri}/v1/chains/${this.chainId}/transactions/${safeTxHash}`,
      { data: deleteTransactionDto },
    );
  }

  // Delegates endpoints

  async createDelegate(
    createDelegateDTO: CGWCreateDelegateDTO,
  ): Promise<CGWDelegate> {
    const { chainId } = configuration.chain;
    const url = `${this.baseUri}/v2/chains/${chainId}/delegates`;
    try {
      const { data } = await httpClient.post(url, createDelegateDTO);
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async deleteDelegate(deleteDelegateDTO: CGWDeleteDelegateDTO): Promise<void> {
    const { chainId } = configuration.chain;
    const url = `${this.baseUri}/v2/chains/${chainId}/delegates/${deleteDelegateDTO.delegate}`;
    await httpClient.delete(url, { data: deleteDelegateDTO });
  }

  async getDelegates(
    getDelegateDTO: CGWGetDelegateDTO,
  ): Promise<CGWDelegate[]> {
    const { chainId } = configuration.chain;
    const url = new URL(`${this.baseUri}/v2/chains/${chainId}/delegates`);
    const { safe, delegate, delegator, label } = getDelegateDTO;
    if (safe) url.searchParams.append('safe', safe);
    if (delegate) url.searchParams.append('delegate', delegate);
    if (delegator) url.searchParams.append('delegator', delegator);
    if (label) url.searchParams.append('label', label);

    const { data } = await httpClient.get(url.toString());
    return data.results;
  }
}
