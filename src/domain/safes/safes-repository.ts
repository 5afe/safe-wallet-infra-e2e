import { configuration } from '@/config/configuration';
import { SafeType } from '@/domain/safes/entities/safe-type';
import { logger } from '@/logging/logger';
import Safe, {
  EthersAdapter,
  SafeAccountConfig,
  SafeFactory,
} from '@safe-global/protocol-kit';
import { Provider, Wallet, ethers } from 'ethers';

export class SafesRepository {
  private readonly provider: Provider;
  private readonly adapter: EthersAdapter;
  private readonly signers: Wallet[];

  constructor(mainPrivateKey: `0x${string}`) {
    const { chain, rpc, privateKeys } = configuration;
    this.provider = new ethers.AlchemyProvider(chain.name, rpc.apiKey);
    const signerOrProvider = new ethers.Wallet(mainPrivateKey, this.provider);
    this.adapter = new EthersAdapter({ ethers, signerOrProvider });
    this.signers = privateKeys.map((pk) => new Wallet(pk, this.provider));
  }

  async getSdkInstance(safeType: SafeType): Promise<Safe> {
    const safeAccountConfig = this.getSafeAccountConfig(safeType);
    const safeAddress = await this.getSafeAddress(safeAccountConfig);
    return Safe.create({ ethAdapter: this.adapter, safeAddress });
  }

  private getPrimarySafeAccountConfig(): SafeAccountConfig {
    return {
      owners: this.signers.map((s) => s.address),
      threshold: 2,
    };
  }

  private getSecondarySafeAccountConfig(): SafeAccountConfig {
    return {
      owners: this.signers.slice(1).map((s) => s.address),
      threshold: 1,
    };
  }

  private getSafeAccountConfig(safeType: SafeType): SafeAccountConfig {
    return safeType === SafeType.PRIMARY
      ? this.getPrimarySafeAccountConfig()
      : this.getSecondarySafeAccountConfig();
  }

  /**
   * Gets the predicted address associated with the provided configuration.
   */
  private async getSafeAddress(
    safeAccountConfig: SafeAccountConfig,
  ): Promise<string> {
    const safeFactory = await SafeFactory.create({ ethAdapter: this.adapter });
    return safeFactory.predictSafeAddress(safeAccountConfig);
  }

  async deploySafe(safeType: SafeType): Promise<Safe | void> {
    const safeAccountConfig = this.getSafeAccountConfig(safeType);
    const safeAddress = await this.getSafeAddress(safeAccountConfig);
    const isDeployed = '0x' !== (await this.provider.getCode(safeAddress));

    if (!isDeployed) {
      const safeFactory = await SafeFactory.create({
        ethAdapter: this.adapter,
      });
      const safe = await safeFactory.deploySafe({ safeAccountConfig });
      const deployedSafeAddress = await safe.getAddress();

      logger.info({
        msg: 'SAFE_DEPLOYED',
        safeType: SafeType[safeType],
        safeWalletUrl: `https://safe-wallet-web.dev.5afe.dev/sep:${deployedSafeAddress}`,
      });

      return safe;
    } else {
      logger.info({
        msg: 'SAFE_ALREADY_DEPLOYED',
        safeType: SafeType[safeType],
        safeWalletUrl: `https://safe-wallet-web.dev.5afe.dev/sep:${safeAddress}`,
      });
    }
  }
}
