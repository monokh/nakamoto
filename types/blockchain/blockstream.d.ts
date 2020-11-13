import { Transaction } from "./transaction";
import { BlockchainClient } from "./client";
export declare class BlockstreamClient implements BlockchainClient {
  url: string;
  constructor(url: string);
  getBlockHeight(): Promise<any>;
  getAddressTransactions(address: string): Promise<Transaction[]>;
}
