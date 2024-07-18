import { configuration } from '@/config/configuration';
import { httpClient } from '@/datasources/http/axios-http-client';
import { faker } from '@faker-js/faker';
import { SafeSignature } from '@safe-global/safe-core-sdk-types';
import { SiweMessage } from 'siwe';

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

export interface CGWCreateAccountDto {
  address: `0x${string}`;
}

export interface CGWAccount {
  id: string;
  groupId: string | null;
  address: string;
}

export interface CGWDataType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface CGWAccountDataSetting {
  dataTypeId: string;
  enabled: boolean;
}

export interface CGWUpsertAccountDataSettingsDto {
  accountDataSettings: CGWAccountDataSetting[];
}

export class ClientGatewayClient {
  private readonly baseUri: string;
  private readonly chainId: string;

  constructor() {
    this.baseUri = configuration.clientGateway.baseUri;
    this.chainId = configuration.chain.chainId;
  }

  // Health check endpoints

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

  // Account endpoints

  async createAccount(
    accessToken: string,
    createAccountDto: CGWCreateAccountDto,
  ): Promise<CGWAccount> {
    const { data } = await httpClient.post(
      `${this.baseUri}/v1/accounts`,
      createAccountDto,
      { headers: { Cookie: accessToken } },
    );
    return data;
  }

  async getAccount(accessToken: string, address: string): Promise<CGWAccount> {
    const { data } = await httpClient.get(
      `${this.baseUri}/v1/accounts/${address}`,
      { headers: { Cookie: accessToken } },
    );
    return data;
  }

  async deleteAccount(accessToken: string, address: string): Promise<void> {
    await httpClient.delete(`${this.baseUri}/v1/accounts/${address}`, {
      headers: { Cookie: accessToken },
    });
  }

  async getDataTypes(): Promise<CGWDataType[]> {
    const { data } = await httpClient.get(
      `${this.baseUri}/v1/accounts/data-types`,
    );
    return data;
  }

  async getAccountDataSettings(
    accessToken: string,
    address: string,
  ): Promise<void> {
    const { data } = await httpClient.get(
      `${this.baseUri}/v1/accounts/${address}/data-settings`,
      {
        headers: { Cookie: accessToken },
      },
    );

    return data;
  }

  async upsertAccountDataSettings(
    accessToken: string,
    address: string,
    dto: CGWUpsertAccountDataSettingsDto,
  ): Promise<void> {
    const { data } = await httpClient.put(
      `${this.baseUri}/v1/accounts/${address}/data-settings`,
      dto,
      {
        headers: { Cookie: accessToken },
      },
    );

    return data;
  }

  // Auth endpoints

  createSiweMessage(address, nonce) {
    const siweMessage = new SiweMessage({
      domain: configuration.siwe.domain,
      address,
      statement: faker.lorem.sentence(),
      uri: faker.internet.url({ appendSlash: false }),
      version: '1',
      chainId: Number(configuration.chain.chainId),
      nonce,
    });
    return siweMessage.prepareMessage();
  }

  async getNonce(): Promise<{ nonce: string }> {
    const { data } = await httpClient.get(`${this.baseUri}/v1/auth/nonce`);
    return data;
  }

  async login(siweDto: SiweDto): Promise<string | undefined> {
    try {
      const { headers } = await httpClient.post(
        `${this.baseUri}/v1/auth/verify`,
        siweDto,
      );
      return headers['set-cookie']?.[0];
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
