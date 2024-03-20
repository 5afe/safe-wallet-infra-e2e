import { CGWTransactionItem } from '@/datasources/cgw/cgw-client';

/**
 * Safe Transaction Service ids include transaction hashes as postfix:
 * https://github.com/safe-global/safe-transaction-service/blob/f6d6fe95388620a149b4bc183ed480e54920f5e4/safe_transaction_service/history/serializers.py#L853
 *
 * These transaction hashes don't include hex '0x' prefix, so it's being sliced.
 */
export function findTransaction(
  transactions: CGWTransactionItem[],
  txHash: string,
): CGWTransactionItem | undefined {
  return transactions.find((i) => i.transaction.id.endsWith(txHash.slice(2)));
}

export function containsTransaction(
  transactions: CGWTransactionItem[],
  txHash: string,
): boolean {
  return !!findTransaction(transactions, txHash);
}
