const { hasReceivedPayment } = require('./blockchain')

const bjs = require('bitcoinjs-lib')
const level = require('level')
const { v4: NewID } = require('uuid')
const EventEmitter = require('events');

const INVOICE_EMITTER = {}
const INTERVALS = {}

class Invoice {
  constructor (id, address, amount, expiration) {
    this.id = id
    this.address = address
    this.amount = amount
    this.expiration = expiration
  }
}

class PayServer {
  constructor (xpub, network) {
    this.xpub = xpub
    this.network = bjs.networks[network]
    this.invoice_db = level('btc-invoice-server-invoices', { valueEncoding: 'json' })
    this.history_db = level('btc-invoice-server-history', { valueEncoding: 'json' })
  }

  async archiveInvoice (invoice, status) {
    // TODO: also archive other details, tx hash, sender etc.
    clearInterval(INTERVALS[invoice.id])
    delete INTERVALS[invoice.id]
    await this.history_db.put(invoice.id, { ...invoice, status })
    await this.invoice_db.del(invoice.id)
  }

  async checkInvoice (id) {
    const invoice = await this.invoice_db.get(id)
    if (await hasReceivedPayment(invoice.address, invoice.amount, true)) {
      INVOICE_EMITTER[invoice.id].emit('payment_received', invoice)
      await this.archiveInvoice(invoice, 'RECEIVED')
    }
    if (Date.now() > invoice.expiration) {
      // TODO: emit expired
      await this.history_db.put(invoice.id, { ...invoice, status: 'EXPIRED' })
    }
  }

  async updateInvoice (invoice) {
    return this.invoice_db.put(invoice.id, invoice)
  }

  // TODO: derive dynamically address
  async newInvoice (address, amount, mins) {
    const id = NewID()
    const expiration = Date.now() + (mins * 60 * 1000)
    const invoice = new Invoice(id, address, amount, expiration)
    await this.updateInvoice(invoice)
    INTERVALS[invoice.id] = setInterval(() => {
      this.checkInvoice(invoice.id)
    }, 1000)
    const emitter = new EventEmitter()
    INVOICE_EMITTER[invoice.id] = emitter
    return { ...invoice, events: emitter }
  }
}

module.exports = { PayServer }