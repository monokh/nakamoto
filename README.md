# BTC Invoice Server

[![NPM](https://img.shields.io/npm/v/btc-invoice-server?style=for-the-badge)](https://www.npmjs.com/package/btc-invoice-server)

A javascript library for handling bitcoin payments in your applications without using a third party service.

## Why

The aim is to provide a very simple interface to generating and handling bitcoin invoices. Additionally a minimal set of well known dependencies are used to reduce the attack surface.

Currently only bech32 (bip84) addresses are supported.

## Disclaimer

There are only a few measly tests. You are definitely entering "send all my bitcoin to the void" territory.

## Installation

`npm install btc-invoice-server`

## Example

```js
const { InvoiceServer, EsploraClient } = require("btc-invoice-server");

// Setup the server
const blockchainClient = new EsploraClient(
  "https://blockstream.info/testnet/api"
);
const server = new InvoiceServer("vpub...", "testnet", blockchainClient);

// Attach the handlers
server.on("invoice_update", (invoice) => {
  console.log(invoice.status, invoice);
});

(async () => {
  await server.start();
  const invoice = await server.newInvoice({ amount: 0.00001 });
  console.log(invoice);
})();
```

Invoice:

```js
{
  id: '401e6ed5-c0c1-4b24-bf6f-4229183553bf',
  address: 'bcrt1q8ds8mk6d9lpgxsvfk2jsadyrn4h4cefrmfjl5l',
  amount: 0.00001,
  expiration: 1605308092639,
  requiredConfirmations: 1,
  data: undefined,
  status: 'ACTIVE'
}
```

## Concepts

The library has 3 concepts:

- **Invoice:** An invoice to be paid
- **BlockchainClient:** A client that implements retrieving address transactions. Currently Bitcoin Core and Esplora are supported.
- **InvoiceServer:** The server which handles active invoices and emits events as updates are available.

### Invoice

Invoices are retrieved using [`newInvoice`](#newinvoice). Updated invoices are emitted from the server and should be handled with `server.on('invoice_update')`. An invoice is as follows:

```js
{
  id: '9540be1a-14ad-4683-a7a8-01d4439d6212',
  address: 'bcrt1q8ds8mk6d9lpgxsvfk2jsadyrn4h4cefrmfjl5l',
  amount: 0.00001,
  expiration: 1605311083321,
  requiredConfirmations: 1,
  status: 'PAYMENT_RECEIVED',
  tx: '08663e9d7304dfa08a7f74bf3610a59a8dd5a5ef0fff3fddb60fcc273e339101' // Included for received trnasactions only
}
```

### Invoice Status

`ACTIVE` | `PAYMENT_RECEIVED` | `PAYMENT_CONFIRMED` | `EXPIRED`

## InvoiceServer

### Constructor

#### Parameters

- `xpub` **string** XPUB key in the correct format. Supports only bip84 paths (bech32)
- `network` **string** Bitcoin network to use `bitcoin` | `testnet` | `regtest`
- `blockchainClient` [**BlockchainClient**](#blockchain-client) Blockchain client used to retrieve address transactions
- `checkInterval` **number** How often in milliseconds to check invoice status

### on('invoice_update')

Adds a handler for invoice updates. Example:

```js
// Attach the handlers
server.on("invoice_update", (invoice) => {
  console.log(invoice.status, invoice);
});
```

### newInvoice

Create a new invoice

#### Parameters

- `options` **NewInvoiceOptions** Options object describing the new invoice
  - `amount` **number** Amount in bitcoin required for the invoice (t.g. 0.0001) REQUIRED
  - `secs` **number** Number of seconds after which the invoice has expired (default 1h)
  - `requiredConfirmations` **number** Number of confirmations required to deem the invoice complete (default 1)
  - `data`: **object** Arbitrary object to include with the invoice. Can be used to hold data relevant to the invoice.

#### Example

Simple invoice

```js
const invoice = await server.newInvoice({ amount: 0.00001 });
```

Invoice accepted with 0 confirmations and expires in 5 minutes

```js
const invoice = await server.newInvoice({
  amount: 0.00001,
  requiredConfirmations: 0,
  secs: 5 * 60,
});
```

## Blockchain Client

A blockchain client is a simple class that must implement one key function

`getAddressTransactions: (address: string) => Promise<Transaction[]>;`

Clients bundled with the library are: [`BitcoinCoreClient`](src/blockchain/bitcoin-core.ts) & [`EpsloraClient`](src/blockchain/esplora.ts)

When using the `BitcoinCoreClient`, make sure to import an appropriate number of addresses to the node BEFORE starting the invoice server. Either manually or using provided utility. This is to due to bitcoin core not having support for xpub.

```js
await blockchainClient.importWallet(XPUB, 5000)
...
await server.start()
```

## Recovering from restarts

No special consideration should be taken for restarting the server process. On start, the server checks pending invoices and relays any updates that happened while the server was offline.
