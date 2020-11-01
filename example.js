const { PayServer } = require('./src')
const { BlockstreamClient } = require('./src/blockchain/blockstream')
const { BitcoindClient } = require('./src/blockchain/bitcoind')

const XPUB = 'vpub5ZrNQoytCn5Huw6HhTxyuXN6QE8PqUagKmvRxftNLcrLBt21prCMXt3o8N65faeaKM1qJBa9Ja9z9TrP7ATKnEHtckkcAqhMEz2AeQ1tN8X'
const NETWORK = 'regtest'

const blockchainClient = new BitcoindClient('http://localhost:18443', 'admin', 'bWyceVZJZZxjtypCXimHFMGDmrO19ZV-g8cud7vMX-E=', NETWORK)
const server = new PayServer(XPUB, NETWORK, blockchainClient)

;(async () => {
  await blockchainClient.importWallet(XPUB, 100)
  console.log('DONE IMPORTING WALLET')

  server.on('payment_received', (invoice) => {
    console.log('PAYMENT RECEIVED', invoice)
  })

  server.on('invoice_expired', (invoice) => {
    console.log('INVOICE EXPIRED', invoice)
  })

  await server.start()

  await server.newInvoice({ amount: 0.00001 })
})()
