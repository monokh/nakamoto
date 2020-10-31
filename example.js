const { PayServer } = require('./src')

const server = new PayServer('xpub', 'testnet')

;(async () => {

  const invoice = await server.newInvoice('tb1q6ecz58j6tjequd3har3r3xggkwt7t6xfaf53mt', 0.0001, 10)

  invoice.events.on('payment_received', (invoice) => {
    console.log('PAYMENT RECEIVED', invoice)
  })

})()
