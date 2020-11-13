import { Transaction } from "./transaction";
export interface BlockchainClient {
    getAddressTransactions: (address: string) => Promise<Transaction[]>;
}
