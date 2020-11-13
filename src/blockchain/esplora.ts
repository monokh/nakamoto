import axios from "axios";
import { Transaction } from "./transaction";
import { BlockchainClient } from "./client";

export class EsploraClient implements BlockchainClient {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  private async _getBlockHeight() {
    // cache it
    return (await axios.get(`${this.url}/blocks/tip/height`)).data;
  }

  async getAddressTransactions(address: string): Promise<Transaction[]> {
    const height = await this._getBlockHeight();
    const txs = (await axios.get(`${this.url}/address/${address}/txs`)).data;
    return txs.map((tx: any) => {
      const confirmations = tx.status.confirmed
        ? height - tx.status.block_height
        : 0;
      const output = tx.vout.find(
        (vout: any) => vout.scriptpubkey_address === address
      );
      const transaction: Transaction = {
        hash: tx.txid,
        amount: output.value / 1e8,
        confirmations,
      };
      return transaction;
    });
  }
}
