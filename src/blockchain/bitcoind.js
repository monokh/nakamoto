const bjs = require('bitcoinjs-lib')
const bip32 = require('bip32')
const networks = require('../utils/networks')
const RpcClient = require('../utils/rpcClient')

class BitcoindClient {
  constructor(url, username, password, network) {
    this.rpc = new RpcClient(url, username, password)
    this.network = networks[network]
  }
  
  async getReceivedByAddress (address, confirmations) {
    return this.rpc.call('getreceivedbyaddress', address, confirmations)
  }

  async importWallet (xpub, numAddresses) {
    // TODO: choose address type
    // TODO toggle mempool accept
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

module.exports = { BitcoindClient }