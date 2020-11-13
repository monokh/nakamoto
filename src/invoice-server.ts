import { Network } from "bitcoinjs-lib";
import * as bjs from "bitcoinjs-lib";
import { BIP32Interface } from "bip32";
import * as bip32 from "bip32";
import level from "level";
import { v4 as NewID } from "uuid";
import { EventEmitter } from "events";
import { Networks } from "./utils/networks";
import { Invoice, INVOICE_STATUS } from "./invoice";
import { BlockchainClient } from "./blockchain/client";
import { LevelUp } from "levelup";

type NewInvoiceOptions = {
  amount: number;
  secs: number;
  requiredConfirmations: number;
  data: any;
};

export class InvoiceServer extends EventEmitter {
  xpub: string;
  network: Network;
  blockchainClient: BlockchainClient;
  baseNode: BIP32Interface;
  invoiceDB: LevelUp;
  historyDB: LevelUp;
  addressesDB: LevelUp;
  checkInterval: number;
  intervals: { [key: string]: NodeJS.Timeout } = {};

  constructor(
    xpub: string,
    network: string,
    blockchainClient: BlockchainClient,
    checkInterval = 10000
  ) {
    super();
    this.network = Networks[network]; // TODO: Bech32only
    this.xpub = xpub;
    this.baseNode = bip32.fromBase58(xpub, this.network);
    this.blockchainClient = blockchainClient;
    this.checkInterval = checkInterval;
    this.invoiceDB = level("db-invoices", { valueEncoding: "json" });
    this.historyDB = level("db-history", { valueEncoding: "json" });
    this.addressesDB = level("db-addresses", { valueEncoding: "json" });
  }

  async start() {
    try {
      await this.addressesDB.get("used");
    } catch (e) {
      if (e.type === "NotFoundError") {
        await this.addressesDB.put("used", []);
      } else throw e;
    }
    return new Promise((resolve) => {
      this.invoiceDB
        .createValueStream()
        .on("data", (invoice) => {
          this._watchInvoice(invoice);
        })
        .on("end", () => {
          resolve();
        });
    });
  }

  async newInvoice(options: Partial<NewInvoiceOptions>) {
    const defaults = {
      secs: 3600,
      requiredConfirmations: 1,
    };
    options = Object.assign({}, defaults, options);
    const id = NewID();
    const address = await this._getNewAddress();
    const expiration = Date.now() + options.secs! * 1000;
    const invoice: Invoice = {
      id,
      address,
      amount: options.amount!,
      expiration,
      requiredConfirmations: options.requiredConfirmations!,
      data: options.data,
      status: INVOICE_STATUS.ACTIVE,
    };
    await this._addInvoice(invoice);
    await this._watchInvoice(invoice);
    return invoice;
  }

  private async _isAddressInUse(address: string) {
    const usedAddresses = await this.addressesDB.get("used");
    return usedAddresses.includes(address);
  }

  private async _getNewAddress() {
    // TODO: choose address type
    for (let i = 0; ; i++) {
      const publicKey = this.baseNode.derive(0).derive(i).publicKey;
      const address = bjs.payments.p2wpkh({
        pubkey: publicKey,
        network: this.network,
      }).address!;

      if (await this._isAddressInUse(address)) continue;
      const addressTransactions = await this.blockchainClient.getAddressTransactions(
        address
      );
      if (addressTransactions.length === 0) {
        return address;
      }
    }
  }

  private async _saveInvoice(invoice: Invoice) {
    return this.invoiceDB.put(invoice.id, invoice);
  }

  private async _archiveInvoice(invoice: Invoice) {
    if (invoice.id in this.intervals) {
      clearInterval(this.intervals[invoice.id]);
      delete this.intervals[invoice.id];
    }
    if (invoice.status === INVOICE_STATUS.EXPIRED) {
      this._removeUsedAddress(invoice.address);
    }
    await this.historyDB.put(invoice.id, invoice);
    await this.invoiceDB.del(invoice.id);
  }

  private async _checkInvoice(id: string) {
    const invoice = await this.invoiceDB.get(id);
    const txs = await this.blockchainClient.getAddressTransactions(
      invoice.address
    );
    const tx = txs.find((_tx) => _tx.amount >= invoice.amount);

    if (tx) {
      if (tx.confirmations >= invoice.requiredConfirmations) {
        invoice.tx = tx.hash;
        invoice.status = INVOICE_STATUS.PAYMENT_CONFIRMED;
        this.emit("invoice_update", invoice);
        await this._archiveInvoice(invoice);
        return true;
      } else if (invoice.tx !== tx.hash) {
        invoice.tx = tx.hash;
        invoice.status = INVOICE_STATUS.PAYMENT_RECEIVED;
        this.emit("invoice_update", invoice);
        await this._saveInvoice(invoice);
        return true;
      }
    }
    if (Date.now() > invoice.expiration) {
      invoice.status = INVOICE_STATUS.EXPIRED;
      this.emit("invoice_update", invoice);
      await this._archiveInvoice(invoice);
      return true;
    }
    return false;
  }

  private async _addUsedAddress(address: string) {
    const usedAddresses = await this.addressesDB.get("used");
    usedAddresses.push(address);
    await this.addressesDB.put("used", usedAddresses);
  }

  private async _removeUsedAddress(address: string) {
    const usedAddresses = await this.addressesDB.get("used");
    usedAddresses.splice(usedAddresses.indexOf(address), 1);
    await this.addressesDB.put("used", usedAddresses);
  }

  private async _addInvoice(invoice: Invoice) {
    await this._addUsedAddress(invoice.address);
    await this.invoiceDB.put(invoice.id, invoice);
  }

  private async _watchInvoice(invoice: Invoice) {
    const resolved = await this._checkInvoice(invoice.id);
    if (resolved) return;

    this.intervals[invoice.id] = setInterval(() => {
      this._checkInvoice(invoice.id);
    }, this.checkInterval);
  }
}
