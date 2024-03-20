import 'dotenv/config';

export const configuration = {
  clientGateway: {
    baseUri: 'https://safe-client.staging.5afe.dev',
  },
  transactionService: {
    baseUri: 'https://safe-transaction-sepolia.staging.5afe.dev/api',
  },
  privateKeys: [
    process.env.PRIVATE_KEY as `0x${string}`,
    process.env.SECOND_PRIVATE_KEY as `0x${string}`,
    process.env.THIRD_PRIVATE_KEY as `0x${string}`,
  ],
  rpc: {
    apiKey: process.env.INFURA_API_KEY,
  },
  walletAddresses: [
    process.env.WALLET_ADDRESS as `0x${string}`,
    process.env.SECOND_WALLET_ADDRESS as `0x${string}`,
    process.env.THIRD_WALLET_ADDRESS as `0x${string}`,
  ],
};
