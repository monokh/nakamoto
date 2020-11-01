const bjs = require('bitcoinjs-lib')

const COIN_TYPE = {
  'bitcoin': 0,
  'testnet': 1,
  'regtest': 1
}

const VERSION_BYTES = { // TODO: assumes bip84 (bech32)
  'bitcoin': {
    public: 0x04b24746,
    private: 0x04b2430c
  },
  'testnet': {
    public: 0x045f1cf6,
    private: 0x045f18bc
  },
  'regtest': {
    public: 0x045f1cf6,
    private: 0x045f18bc
  }
}

const networks = Object.entries(bjs.networks).reduce((obj, [key, network]) => {
  return Object.assign(obj, { [key]: {
    ...network,
    bip32: VERSION_BYTES[key],
    coinType: COIN_TYPE[key]
  } })
}, {})

module.exports = networks