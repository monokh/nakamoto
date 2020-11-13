import { Network } from "bitcoinjs-lib";
import { BlockchainClient } from "./client";
import { Transaction } from "./transaction";
import { RpcClient } from "../utils/rpc-client";
export declare class BitcoinCoreClient implements BlockchainClient {
    rpc: RpcClient;
    network: Network;
    constructor(url: string, username: string, password: string, network: string);
    private _getTransaction;
    getAddressTransactions(address: string): Promise<Transaction[]>;
    importWallet(xpub: string, numAddresses: number): Promise<any>;
}
