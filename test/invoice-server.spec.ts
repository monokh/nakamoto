import assert from "assert";
import { RpcClient } from "../src/utils/rpc-client";
import { Invoice, INVOICE_STATUS } from "../src/invoice";
import { InvoiceServer } from "../src/invoice-server";
import { BitcoinCoreClient } from "../src/blockchain/bitcoin-core";

const RPC_URL = "http://localhost:18443";
const RPC_USER = "admin";
const RPC_PASSWORD = "bWyceVZJZZxjtypCXimHFMGDmrO19ZV-g8cud7vMX-E=";
const rpc = new RpcClient(RPC_URL, RPC_USER, RPC_PASSWORD);

const XPUB =
  "vpub5ZrNQoytCn5Huw6HhTxyuXN6QE8PqUagKmvRxftNLcrLBt21prCMXt3o8N65faeaKM1qJBa9Ja9z9TrP7ATKnEHtckkcAqhMEz2AeQ1tN8X";
const NETWORK = "regtest";
const blockchainClient = new BitcoinCoreClient(
  RPC_URL,
  RPC_USER,
  RPC_PASSWORD,
  NETWORK
);

async function sleep(millis: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), millis);
  });
}

async function mineBlocks(n: number) {
  const newAddress = await rpc.call("getnewaddress");
  await rpc.call("generatetoaddress", n, newAddress);
}

function resolveInvoiceStatus(
  server: InvoiceServer,
  status: INVOICE_STATUS
): Promise<Invoice> {
  return new Promise((resolve) => {
    server.on("invoice_update", (invoice) => {
      if (invoice.status === status) resolve(invoice);
    });
  });
}

describe("Pay Server", () => {
  let server: InvoiceServer;

  before(async () => {
    await mineBlocks(101);
    await blockchainClient.importWallet(XPUB, 100);
  });

  beforeEach(async () => {
    if (server) {
      await server.invoiceDB.clear();
      await server.historyDB.clear();
      await server.addressesDB.clear();
      await server.invoiceDB.close();
      await server.historyDB.close();
      await server.addressesDB.close();
    }
    server = new InvoiceServer(XPUB, NETWORK, blockchainClient, 500);
    await server.start();
  });

  afterEach(async () => {
    Object.values(server.intervals).forEach((interval) =>
      clearInterval(interval)
    );
  });

  it("Does not reuse addresses", async () => {
    const invoice1 = await server.newInvoice({ amount: 0.00001 });
    const invoice2 = await server.newInvoice({ amount: 0.00001 });
    assert.notStrictEqual(invoice1.address, invoice2.address);
  });

  it("Expired addresses get reused", async () => {
    await server.newInvoice({ amount: 0.00001 });
    const expiredInvoice = await server.newInvoice({
      amount: 0.00001,
      secs: 2,
    });
    await server.newInvoice({ amount: 0.00001 });
    await sleep(3000);
    const reusingInvoice = await server.newInvoice({ amount: 0.00001 });
    assert.strictEqual(reusingInvoice.address, expiredInvoice.address);
  });

  it("Invoice calls receive when payment tx received (0 confs)", async () => {
    const receivedPromise = resolveInvoiceStatus(
      server,
      INVOICE_STATUS.PAYMENT_RECEIVED
    );
    const confirmedPromise = resolveInvoiceStatus(
      server,
      INVOICE_STATUS.PAYMENT_CONFIRMED
    );
    const invoice = await server.newInvoice({ amount: 0.00001 });
    await rpc.call("sendtoaddress", invoice.address, 0.00001);
    const receivedInvoice = await receivedPromise;
    assert.strictEqual(receivedInvoice.status, INVOICE_STATUS.PAYMENT_RECEIVED);
    await mineBlocks(1);
    const confirmedInvoice = await confirmedPromise;
    assert.strictEqual(
      confirmedInvoice.status,
      INVOICE_STATUS.PAYMENT_CONFIRMED
    );
  });

  it("Invoice completes when payment confirmed", async () => {
    const confirmedPromise = resolveInvoiceStatus(
      server,
      INVOICE_STATUS.PAYMENT_CONFIRMED
    );
    const invoice = await server.newInvoice({ amount: 0.00001 });
    await rpc.call("sendtoaddress", invoice.address, 0.00001);
    await mineBlocks(1);
    const confirmedInvoice = await confirmedPromise;
    assert.strictEqual(
      confirmedInvoice.status,
      INVOICE_STATUS.PAYMENT_CONFIRMED
    );
  });

  it("Invoice expires when payment not received", async () => {
    const expiredPromise = resolveInvoiceStatus(server, INVOICE_STATUS.EXPIRED);
    await server.newInvoice({ amount: 0.00001, secs: 2 });
    const expiredInvoice = await expiredPromise;
    assert.strictEqual(expiredInvoice.status, INVOICE_STATUS.EXPIRED);
  }).timeout(10000);

  it("Invoice expires when confirmations not reached", async () => {
    const expiredPromise = resolveInvoiceStatus(server, INVOICE_STATUS.EXPIRED);
    await server.newInvoice({
      amount: 0.00001,
      secs: 2,
      requiredConfirmations: 3,
    });
    await mineBlocks(2);
    const expiredInvoice = await expiredPromise;
    assert.strictEqual(expiredInvoice.status, INVOICE_STATUS.EXPIRED);
  }).timeout(10000);
});
