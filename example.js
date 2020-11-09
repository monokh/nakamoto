const { InvoiceServer, INVOICE_STATUS, BlockstreamClient, BitcoindClient } = require('./src')

const XPUB = 'vpub5ZrNQoytCn5Huw6HhTxyuXN6QE8PqUagKmvRxftNLcrLBt21prCMXt3o8N65faeaKM1qJBa9Ja9z9TrP7ATKnEHtckkcAqhMEz2AeQ1tN8X'
const NETWORK = 'regtest'

const blockchainClient = new BitcoindClient('http://localhost:18443', 'admin', 'bWyceVZJZZxjtypCXimHFMGDmrO19ZV-g8cud7vMX-E=', NETWORK)
const server = new InvoiceServer(XPUB, NETWORK, blockchainClient)

;(async () => {
  await blockchainClient.importWallet(XPUB, 100)
  console.log('DONE IMPORTING WALLET')

  server.on('invoice_update', (invoice) => {
    console.log(invoice.status, invoice)
  })

  await server.start()

  await server.newInvoice({ amount: 0.00001, secs: 10 })
})()
