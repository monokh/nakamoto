import { Network } from "bitcoinjs-lib";
import * as bjs from "bitcoinjs-lib";

const VERSION_BYTES: any = {
  // TODO: assumes bip84 (bech32)
  bitcoin: {
    public: 0x04b24746,
    private: 0x04b2430c,
  },
  testnet: {
    public: 0x045f1cf6,
    private: 0x045f18bc,
  },
  regtest: {
    public: 0x045f1cf6,
    private: 0x045f18bc,
  },
};

export const Networks: { [key: string]: Network } = Object.entries(
  bjs.networks
).reduce((obj, [key, network]) => {
  network.bip32 = VERSION_BYTES[key];
  return Object.assign(obj, { [key]: network });
}, {});
