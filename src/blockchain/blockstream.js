const axios = require('axios')

class BlockstreamClient {
  constructor (url) {
    this.url = url
  }

  async getBlockHeight () { // cache it
    return (await axios.get(`${this.url}/blocks/tip/height`)).data
  }
  
  async getReceivedByAddress (address, reqConfs) {
    const height = await this.getBlockHeight()
    const txs = (await axios.get(`${this.url}/address/${address}/txs`)).data
    let received = 0
    txs.forEach(tx => {
      const confirmations = tx.status.confirmed ? height - tx.status.block_height : 0
      if (confirmations >= reqConfs) {
        const output = tx.vout.find(vout => vout.scriptpubkey_address === address)
        received += output.value
      }
    })
    return received / 1e8
  }
}


module.exports = { BlockstreamClient }