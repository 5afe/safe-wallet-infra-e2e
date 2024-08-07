import 'dotenv/config';

export const configuration = {
  chain: {
    chainId: '11155111',
    name: 'sepolia',
  },
  clientGateway: {
    baseUri: 'https://safe-client.staging.5afe.dev',
  },
  privateKeys: [
    process.env.PRIVATE_KEY as `0x${string}`,
    process.env.SECOND_PRIVATE_KEY as `0x${string}`,
    process.env.THIRD_PRIVATE_KEY as `0x${string}`,
  ],
  rpc: {
    apiKey: process.env.ALCHEMY_API_KEY,
  },
  siwe: {
    domain: 'safe',
  },
  transactionService: {
    baseUri: 'https://safe-transaction-sepolia.staging.5afe.dev/api',
  },
  walletAddresses: [
    process.env.WALLET_ADDRESS as `0x${string}`,
    process.env.SECOND_WALLET_ADDRESS as `0x${string}`,
    process.env.THIRD_WALLET_ADDRESS as `0x${string}`,
  ],
};
