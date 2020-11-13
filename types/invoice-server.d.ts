/// <reference types="node" />
import { Network } from "bitcoinjs-lib";
import { BIP32Interface } from "bip32";
import { EventEmitter } from "events";
import { Invoice } from "./invoice";
import { BlockchainClient } from "./blockchain/client";
import { LevelUp } from "levelup";
declare type NewInvoiceOptions = {
    amount: number;
    secs: number;
    requiredConfirmations: number;
    data: any;
};
export declare class InvoiceServer extends EventEmitter {
    xpub: string;
    network: Network;
    blockchainClient: BlockchainClient;
    baseNode: BIP32Interface;
    invoiceDB: LevelUp;
    historyDB: LevelUp;
    addressesDB: LevelUp;
    checkInterval: number;
    intervals: {
        [key: string]: NodeJS.Timeout;
    };
    constructor(xpub: string, network: string, blockchainClient: BlockchainClient, checkInterval?: number);
    start(): Promise<unknown>;
    newInvoice(options: Partial<NewInvoiceOptions>): Promise<Invoice>;
    private _isAddressInUse;
    private _getNewAddress;
    private _saveInvoice;
    private _archiveInvoice;
    private _checkInvoice;
    private _addUsedAddress;
    private _removeUsedAddress;
    private _addInvoice;
    private _watchInvoice;
}
export {};
