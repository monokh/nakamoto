const axios = require('axios')

// TODO: node integration
const BASE_URL = 'https://blockstream.info/testnet/api'

async function hasReceivedPayment (address, amount, mempoolAllowed) {
  const addressDetails = (await axios.get(`${BASE_URL}/address/${address}`)).data
  console.log(addressDetails)
  let received = addressDetails.chain_stats.funded_txo_sum
  if (mempoolAllowed) received += addressDetails.mempool_stats.funded_txo_sum
  return received >= amount * 1e8
}

module.exports = { hasReceivedPayment }