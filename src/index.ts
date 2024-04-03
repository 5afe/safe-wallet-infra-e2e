import { configuration } from '@/config/configuration';
import { EOARepository } from '@/domain/eoa/eoa-repository';
import { SafeType } from '@/domain/safes/entities/safe-type';
import { SafesRepository } from '@/domain/safes/safes-repository';
import 'dotenv/config';

const { privateKeys } = configuration;

async function init(safesRepository: SafesRepository): Promise<void> {
  await safesRepository.deploySafe(SafeType.PRIMARY);
  await safesRepository.deploySafe(SafeType.SECONDARY);
}

async function main() {
  const safesRepository = new SafesRepository(privateKeys[0]);
  await init(safesRepository);

  const eoaRepository = new EOARepository();
  await eoaRepository.equilibrateBalances();
}

(() => main())();
