const axios = require('axios')

class BlockstreamClient {
  constructor (url) {
    this.url = url
  }

  async getBlockHeight () { // cache it
    return (await axios.get(`${this.url}/blocks/tip/height`)).data
  }
  
  async getAddressTransactions (address) {
    const height = await this.getBlockHeight()
    const txs = (await axios.get(`${this.url}/address/${address}/txs`)).data
    return txs.map(tx => {
      const confirmations = tx.status.confirmed ? height - tx.status.block_height : 0
      const output = tx.vout.find(vout => vout.scriptpubkey_address === address)
      return {
        hash: tx.hash,
        confirmations,
        amount: output.value / 1e8
      }
    })
  }
}


module.exports = BlockstreamClient