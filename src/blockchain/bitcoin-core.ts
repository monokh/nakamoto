import { Network } from "bitcoinjs-lib";
import * as bjs from "bitcoinjs-lib";
import * as bip32 from "bip32";
import { BlockchainClient } from "./client";
import { Transaction } from "./transaction";
import { Networks } from "../utils/networks";
import { RpcClient } from "../utils/rpc-client";

export class BitcoinCoreClient implements BlockchainClient {
  rpc: RpcClient;
  network: Network;

  constructor(
    url: string,
    username: string,
    password: string,
    network: string
  ) {
    this.rpc = new RpcClient(url, username, password);
    this.network = Networks[network];
  }

  private async _getTransaction(hash: string) {
    return this.rpc.call("gettransaction", hash);
  }

  async getAddressTransactions(address: string) {
    const receivedByAddress = await this.rpc.call(
      "listreceivedbyaddress",
      0,
      false,
      true,
      address
    );
    if (receivedByAddress.length === 0) return [];
    const txs = await Promise.all(
      receivedByAddress[0].txids.map((hash: string) =>
        this._getTransaction(hash)
      )
    );
    return txs.map((tx: any) => {
      const transaction: Transaction = {
        hash: tx.txid,
        confirmations: tx.confirmations,
        amount: Math.abs(tx.amount),
      };
      return transaction;
    });
  }

  async importWallet(xpub: string, numAddresses: number) {
    const baseNode = bip32.fromBase58(xpub, this.network);
    const addresses = [];
    for (let i = 0; i < numAddresses; i++) {
      const publicKey = baseNode.derive(0).derive(i).publicKey;
      const address = bjs.payments.p2wpkh({
        pubkey: publicKey,
        network: this.network,
      }).address;
      addresses.push(address);
    }

    const addrRequest = addresses.map((addr) => ({
      scriptPubKey: { address: addr },
      watchonly: true,
      timestamp: "now",
    }));

    return this.rpc.call("importmulti", addrRequest);
  }
}
