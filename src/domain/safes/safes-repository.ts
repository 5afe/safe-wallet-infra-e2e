import { configuration } from '@/config/configuration';
import { logger } from '@/logging/logger';
import Safe, {
  EthersAdapter,
  SafeAccountConfig,
  SafeFactory,
} from '@safe-global/protocol-kit';
import { Provider, Wallet, ethers } from 'ethers';

const { privateKeys } = configuration;
const { INFURA_API_KEY } = process.env;

export class SafesRepository {
  private readonly provider: Provider;
  private readonly adapter: EthersAdapter;
  private readonly signers: Wallet[];
  private readonly safeFactory: SafeFactory;

  constructor(privateKey: `0x${string}`) {
    this.provider = new ethers.InfuraProvider('sepolia', INFURA_API_KEY);
    this.adapter = new EthersAdapter({
      ethers,
      signerOrProvider: new ethers.Wallet(privateKey, this.provider),
    });
    this.signers = privateKeys.map((pk) => new Wallet(pk, this.provider));
  }

  async init(): Promise<void> {
    const safeAddress = await this.getSafeAddress();
    const isDeployed = '0x' !== (await this.provider.getCode(safeAddress));

    if (!isDeployed) {
      await this.deploySafe();
    } else {
      logger.info({
        msg: 'SAFE_ALREADY_DEPLOYED',
        safeWalletUrl: `https://safe-wallet-web.dev.5afe.dev/sep:${safeAddress}`,
      });
    }
  }

  async getSdkInstance(): Promise<Safe> {
    const safeAddress = await this.getSafeAddress();
    return Safe.create({
      ethAdapter: this.adapter,
      safeAddress,
    });
  }

  private getSafeAccountConfig(): SafeAccountConfig {
    const owners = this.signers.map((s) => s.address);
    return { owners, threshold: 2 };
  }

  private async getSafeAddress(): Promise<string> {
    const safeAccountConfig = this.getSafeAccountConfig();
    const safeFactory = await SafeFactory.create({ ethAdapter: this.adapter });
    return safeFactory.predictSafeAddress(safeAccountConfig);
  }

  private async deploySafe(): Promise<Safe> {
    const safeAccountConfig = this.getSafeAccountConfig();
    const safeFactory = await SafeFactory.create({ ethAdapter: this.adapter });
    const safe = await safeFactory.deploySafe({ safeAccountConfig });
    const safeAddress = await safe.getAddress();

    logger.info({
      msg: 'SAFE_DEPLOYED',
      safeWalletUrl: `https://safe-wallet-web.dev.5afe.dev/sep:${safeAddress}`,
    });

    return safe;
  }
}
