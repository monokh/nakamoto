// String to be appended to bitcoin.conf:
// rpcauth=admin:7778210eb8132a44c262b405fa8b00ee$2c906d8c35ae72efcc974b7849a417041bf23a1acece2a64697e36c9d44fa096
// Your password:
// bWyceVZJZZxjtypCXimHFMGDmrO19ZV-g8cud7vMX-E=

const assert = require('assert');
const fs = require('fs')
const RpcClient = require('../src/utils/rpcClient')
const { PayServer } = require('../src')
const { BitcoindClient } = require('../src/blockchain/bitcoind')

const RPC_URL = 'http://localhost:18443'
const RPC_USER = 'admin'
const RPC_PASSWORD = 'bWyceVZJZZxjtypCXimHFMGDmrO19ZV-g8cud7vMX-E='
const rpc = new RpcClient(RPC_URL, RPC_USER, RPC_PASSWORD)

const DBS = ['invoice_db', 'history_db', 'addresses_db']

const XPUB = 'vpub5ZrNQoytCn5Huw6HhTxyuXN6QE8PqUagKmvRxftNLcrLBt21prCMXt3o8N65faeaKM1qJBa9Ja9z9TrP7ATKnEHtckkcAqhMEz2AeQ1tN8X'
const NETWORK = 'regtest'
const blockchainClient = new BitcoindClient(RPC_URL, RPC_USER, RPC_PASSWORD, NETWORK)

async function sleep (millis) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), millis)
  })
}

async function mineBlocks (n) {
  const newAddress = await rpc.call('getnewaddress')
  await rpc.call('generatetoaddress', n, newAddress)
}

function resolvePayment (server) {
  return new Promise((resolve, reject) => {
    server.on('payment_received', (invoice) => { resolve(invoice) })
  })
}

function resolveExpiration (server) {
  return new Promise((resolve, reject) => {
    server.on('invoice_expired', (invoice) => { resolve(invoice) })
  })
}

describe('Pay Server', function() {

  let server

  before(async () => {
    await mineBlocks(101)
    await blockchainClient.importWallet(XPUB, 100)
  })

  beforeEach(async () => {
    if (server) {
      await Promise.all(DBS.map(db => server[db].clear()))
      await Promise.all(DBS.map(db => server[db].close()))
    }
    server = new PayServer(XPUB, NETWORK, blockchainClient)
    await server.start()
  })

  afterEach(async () => {
    Object.values(server.intervals).forEach(interval => clearInterval(interval))
  })

  it('Does not reuse addresses', async () => {
    const invoice1 = await server.newInvoice({ amount: 0.00001 })
    const invoice2 = await server.newInvoice({ amount: 0.00001 })
    assert.notStrictEqual(invoice1.address, invoice2.address)
  })

  it('Expired addresses get reused', async () => {
    await server.newInvoice({ amount: 0.00001 })
    const expiredInvoice = await server.newInvoice({ amount: 0.00001, secs: 2 })
    await server.newInvoice({ amount: 0.00001 })
    await sleep(2000)
    const reusingInvoice = await server.newInvoice({ amount: 0.00001 })
    assert.strictEqual(reusingInvoice.address, expiredInvoice.address)
  })

  it('Invoice resolves when payment received', async () => {
    const receivedPromise = resolvePayment(server)
    const invoice = await server.newInvoice({ amount: 0.00001 })
    await rpc.call('sendtoaddress', invoice.address, 0.00001)
    await mineBlocks(1)
    const receivedInvoice = await receivedPromise
    assert.strictEqual(receivedInvoice.status, 'RECEIVED')
  })

  it('Invoice expires when payment not received', async () => {
    const expiredPromise = resolveExpiration(server)
    await server.newInvoice({ amount: 0.00001, secs: 2 })
    const expiredInvoice = await expiredPromise
    assert.strictEqual(expiredInvoice.status, 'EXPIRED')
  }).timeout(10000)

  it('Invoice expires when confirmations not reached', async () => {
    const expiredPromise = resolveExpiration(server)
    await server.newInvoice({ amount: 0.00001, secs: 2, requiredConfirmations: 3 })
    await mineBlocks(2)
    const expiredInvoice = await expiredPromise
    assert.strictEqual(expiredInvoice.status, 'EXPIRED')
  }).timeout(10000)
})