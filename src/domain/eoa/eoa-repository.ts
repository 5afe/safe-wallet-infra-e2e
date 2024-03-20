import { configuration } from '@/config/configuration';
import { logger } from '@/logging/logger';
import { InfuraProvider, JsonRpcApiProvider, Wallet, ethers } from 'ethers';

const { INFURA_API_KEY } = process.env;

export class EOARepository {
  private readonly provider: InfuraProvider;
  private readonly refillThreshold = 0.01;

  constructor() {
    this.provider = new ethers.InfuraProvider('sepolia', INFURA_API_KEY);
  }

  async equilibrateBalances(): Promise<void> {
    const wallets = configuration.privateKeys.map(
      (pk) => new Wallet(pk, this.provider),
    );

    for (const wallet of wallets) {
      const balance = await this.provider.getBalance(wallet.address);
      const ethBalance = Number(ethers.formatUnits(balance, 'ether'));
      logger.info({
        address: wallet.address,
        balance: ethBalance,
        unit: 'ether',
      });

      if (ethBalance <= this.refillThreshold) {
        const fundedWallet = await this._getFundedWallet(
          this.provider,
          wallets.filter((w) => w.address !== wallet.address),
        );
        const tx = await fundedWallet.sendTransaction({
          to: wallet.address,
          value: ethers.parseUnits('0.05', 'ether'),
        });
        logger.info({
          msg: 'TRANSFER NATIVE COIN',
          from: fundedWallet.address,
          to: wallet.address,
          txHash: tx.hash,
        });
      }
    }
  }

  private async _getFundedWallet(
    provider: JsonRpcApiProvider,
    wallets: Wallet[],
  ): Promise<Wallet> {
    for (const wallet of wallets) {
      const address = await wallet.getAddress();
      const ethBalance = await provider.getBalance(address);

      if (ethBalance >= this.refillThreshold) {
        return wallet;
      }
    }

    throw Error('None of the configured Wallets have enough ETH');
  }
}
