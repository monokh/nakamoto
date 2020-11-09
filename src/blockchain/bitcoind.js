const bjs = require('bitcoinjs-lib')
const bip32 = require('bip32')
const networks = require('../utils/networks')
const RpcClient = require('../utils/rpc-client')

class BitcoindClient {
  constructor(url, username, password, network) {
    this.rpc = new RpcClient(url, username, password)
    this.network = networks[network]
  }

  async getTransaction (hash) {
    return this.rpc.call('gettransaction', hash)
  }
  
  async getAddressTransactions (address) {
    const receivedByAddress = await this.rpc.call('listreceivedbyaddress', 0, false, true, address)
    if (receivedByAddress.length === 0) return []
    const txs = await Promise.all(receivedByAddress[0].txids.map(hash => this.getTransaction(hash)))
    return txs.map(tx => ({
      hash: tx.txid,
      confirmations: tx.confirmations,
      amount: Math.abs(tx.amount)
    }))
  }

  async importWallet (xpub, numAddresses) {
    const baseNode = bip32.fromBase58(xpub, this.network)
    const addresses = []
    for(let i = 0; i < numAddresses; i++) {
      const publicKey = baseNode.derive(0).derive(i).publicKey
      const address = bjs.payments.p2wpkh({ pubkey: publicKey, network: this.network }).address
      addresses.push(address)
    }

    const addrRequest = addresses.map(addr => ({ scriptPubKey: { address: addr }, watchonly: true, timestamp: "now" }))

    return this.rpc.call('importmulti', addrRequest)
  }
}

module.exports = BitcoindClient