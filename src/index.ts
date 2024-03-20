import { configuration } from '@/config/configuration';
import { EOARepository } from '@/domain/eoa/eoa-repository';
import { SafesRepository } from '@/domain/safes/safes-repository';
import 'dotenv/config';

const { privateKeys } = configuration;

async function main() {
  const safesRepository = new SafesRepository(privateKeys[0]);
  await safesRepository.init();

  const eoaRepository = new EOARepository();
  await eoaRepository.equilibrateBalances();
}

(() => main())();
