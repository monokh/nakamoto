import { Transaction } from "./transaction";
import { BlockchainClient } from "./client";
export declare class EsploraClient implements BlockchainClient {
    url: string;
    constructor(url: string);
    private _getBlockHeight;
    getAddressTransactions(address: string): Promise<Transaction[]>;
}
