const bjs = require('bitcoinjs-lib')
const bip32 = require('bip32')
const level = require('level')
const { v4: NewID } = require('uuid')
const EventEmitter = require('events');
const networks = require('./utils/networks')
const { Invoice, INVOICE_STATUS } = require('./invoice')

class InvoiceServer extends EventEmitter {
  constructor (xpub, network, blockchainClient) {
    super()
    this.network = networks[network] // TODO: Bech32only
    this.baseNode = bip32.fromBase58(xpub, this.network)
    this.blockchainClient = blockchainClient
    this.invoice_db = level('db-invoices', { valueEncoding: 'json' })
    this.history_db = level('db-history', { valueEncoding: 'json' })
    this.addresses_db = level('db-addresses', { valueEncoding: 'json' })
    this.intervals = {}
  }

  async start() {
    try {
      await this.addresses_db.get('used')
    } catch (e) {
      if (e.type == 'NotFoundError') {
        await this.addresses_db.put('used', [])
      } else throw e
    }
    return new Promise((resolve, reject) => {
      this.invoice_db.createValueStream()
      .on('data', (invoice) => {
        this.watchInvoice(invoice)
      })
      .on ('end', () => {
        resolve()
      })
    })
  }

  async isAddressInUse (address) {
    const usedAddresses = await this.addresses_db.get('used')
    return usedAddresses.includes(address)
  }

  async getNewAddress () {
    // TODO: choose address type
    for(let i = 0; ;i++) {
      const publicKey = this.baseNode.derive(0).derive(i).publicKey
      const address = bjs.payments.p2wpkh({ pubkey: publicKey, network: this.network }).address

      if (await this.isAddressInUse(address)) continue
      const addressTransactions = await this.blockchainClient.getAddressTransactions(address)
      if (addressTransactions.length === 0) {
        return address
      }
    }
  }

  async saveInvoice (invoice) {
    return this.invoice_db.put(invoice.id, invoice)
  }

  async archiveInvoice (invoice) {
    if (invoice.id in this.intervals) {
      clearInterval(this.intervals[invoice.id])
      delete this.intervals[invoice.id]
    }
    if (invoice.status === INVOICE_STATUS.EXPIRED) {
      this.removeUsedAddress(invoice.address)
    }
    await this.history_db.put(invoice.id, invoice)
    await this.invoice_db.del(invoice.id)
  }

  async checkInvoice (id) {
    const invoice = await this.invoice_db.get(id)
    const txs = await this.blockchainClient.getAddressTransactions(invoice.address)
    const tx = txs.find(tx => tx.amount >= invoice.amount)

    if (tx) {
      if (tx.confirmations >= invoice.requiredConfirmations) {
        invoice.tx = tx.hash
        invoice.status = INVOICE_STATUS.PAYMENT_CONFIRMED
        this.emit('invoice_update', invoice)
        await this.archiveInvoice(invoice)
        return true
      } else if(invoice.tx !== tx.hash) {
        invoice.tx = tx.hash
        invoice.status = INVOICE_STATUS.PAYMENT_RECEIVED
        this.emit('invoice_update', invoice)
        await this.saveInvoice(invoice)
        return true
      }
    }
    if (Date.now() > invoice.expiration) {
      invoice.status = INVOICE_STATUS.EXPIRED
      this.emit('invoice_update', invoice)
      await this.archiveInvoice(invoice)
      return true
    }
    return false
  }

  async addUsedAddress (address) {
    const usedAddresses = await this.addresses_db.get('used')
    usedAddresses.push(address)
    await this.addresses_db.put('used', usedAddresses)
  }

  async removeUsedAddress (address) {
    const usedAddresses = await this.addresses_db.get('used')
    usedAddresses.splice(usedAddresses.indexOf(address), 1)
    await this.addresses_db.put('used', usedAddresses)
  }

  async addInvoice (invoice) {
    await this.addUsedAddress(invoice.address)
    await this.invoice_db.put(invoice.id, invoice)
  }

  async watchInvoice (invoice) {
    const resolved = await this.checkInvoice(invoice.id)
    if (resolved) return

    this.intervals[invoice.id] = setInterval(() => {
      this.checkInvoice(invoice.id)
    }, 1000)
  }

  async newInvoice (options) {
    const defaults = {
      secs: 3600,
      requiredConfirmations: 1
    }
    options = Object.assign({}, defaults, options);
    const id = NewID()
    const address = await this.getNewAddress()
    const expiration = Date.now() + (options.secs * 1000)
    const invoice = new Invoice(id, address, options.amount, expiration, options.requiredConfirmations, options.data)
    await this.addInvoice(invoice)
    await this.watchInvoice(invoice)
    return invoice
  }
}

module.exports = InvoiceServer