# Safe Backend Integration

Safe Backend integration tests runner.

## Requirements

- Node 20.11.1 – https://nodejs.org/en/

## Installation

**Optional:** If you have NVM installed, you can run `nvm use` in the root folder of the project to use the recommended
Node version set for this project.

We use Yarn as the package manager for this project. Yarn is bundled with the project so to use it run:

```bash
corepack enable && yarn install
```

## 1. Running the setup process

First, configure your private keys and public addresses for the three signer addresses used to run the tests by creating a `.env` file. You can use `.env.sample` as a template.

Then, run the setup application:

```bash
tsx src/index.ts
```

This would print 4 log messages in JSON format indicating the outcome of the execution. Given the provided data for the three signer addresses, the setup process will:

- Check if a Safe is deployed for the given signer addresses setup. i.e.: it would check the on-chain data to see whether a 2/3 Safe with with the provided signer addresses as signers exist on the Sepolia chain.

  - If a Safe exists, it will print a `SAFE_ALREADY_DEPLOYED` message, and a link to Safe Wallet Web.
  - If it doesn't exist, it would deploy a new Safe with the provided configuration, and it will print a `SAFE_DEPLOYED` message with the link to Safe Wallet Web.

- Check the ETH balances of the provided signer addresses in Sepolia.

  - If any of the signer addresses has less than `0.01 ETH`, it will pick a signer with more than `0.01 ETH`, and try to send `0.01 ETH` to the first one. If none of the signer has more than `0.01 ETH`, an error will be thrown.

- Print 3 log lines more indicating the address and the balance of each of the signer addresses configured as Safe signers.

## 2. Running the tests

After the setup process is successfully completed, you can run the tests:

```bash
yarn test
```
