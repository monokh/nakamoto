const INVOICE_STATUS = {
  ACTIVE: 'ACTIVE',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  EXPIRED: 'EXPIRED'
}

class Invoice {
  constructor(id, address, amount, expiration, requiredConfirmations, data) {
    this.id = id
    this.address = address
    this.amount = amount
    this.expiration = expiration
    this.requiredConfirmations = requiredConfirmations
    this.data = data
    this.status = INVOICE_STATUS.ACTIVE
  }
}

module.exports = { Invoice, INVOICE_STATUS }