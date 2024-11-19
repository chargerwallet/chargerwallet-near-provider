/// <reference types="node" />
import { IJsonRpcRequest } from '@chargerwallet/cross-inpage-provider-types';
import { IInpageProviderConfig } from '@chargerwallet/cross-inpage-provider-core';
import { Account, Connection, transactions } from 'near-api-js';
import type { Action as NearTransactionAction, Transaction as NearTransaction } from 'near-api-js/lib/transaction';
import type { AccessKeyInfoView, FinalExecutionOutcome } from 'near-api-js/lib/providers/provider';
import { ProviderNearBase } from './ProviderNearBase';
export type NearAccountInfo = {
    accountId: string;
    publicKey: string;
    allKeys?: string[];
};
export type NearNetworkInfo = {
    networkId: string;
    nodeUrls?: string[];
};
export type NearNetworkChangedPayload = NearNetworkInfo;
export type NearProviderState = {
    accounts: Array<NearAccountInfo>;
    network: NearNetworkChangedPayload;
};
export type NearAccountsChangedPayload = {
    accounts: Array<NearAccountInfo>;
};
export type NearUnlockChangedPayload = {
    isUnlocked: boolean;
};
export type NearConnection = Connection;
export type TransactionCreatorParams = {
    accountId: string;
    publicKey: string;
    receiverId: string;
    nonce: number;
    actions: NearTransactionAction[];
    blockHash: Buffer;
};
export type TransactionCreator = (params: TransactionCreatorParams) => any;
export type ChargerWalletNearWalletProps = {
    connection?: NearConnection | any;
    networkId?: string;
    connectEagerly?: boolean;
    enablePageReload?: boolean;
    timeout?: number;
    keyPrefix?: string;
    transactionCreator?: TransactionCreator;
} & IInpageProviderConfig;
export type ChargerWalletWalletAccountProps = {
    wallet: ChargerWalletNearProvider;
    connection: unknown;
    accountId: string;
};
export type CommonOptionsMeta = unknown | string | object;
export type SignInOptions = {
    contractId?: string;
    methodNames?: string[];
    successUrl?: string;
    failureUrl?: string;
};
export type SignInResult = NearAccountsChangedPayload;
export type SignTransactionsOptions = {
    transactions: NearTransaction[];
    callbackUrl?: string;
    meta?: CommonOptionsMeta;
    send?: boolean;
};
export type SignTransactionsResult = {
    transactionHashes: string[];
};
export type SignMessagesOptions = {
    messages: string[];
    meta?: CommonOptionsMeta;
};
export type SignMessagesResult = {
    signatures: string[];
};
export type CreateTransactionOptions = {
    receiverId: string;
    actions: NearTransactionAction[];
    nonceOffset?: number;
};
export type SignAndSendTransactionOptions = {
    receiverId: string;
    actions: NearTransactionAction[];
    meta?: CommonOptionsMeta;
    callbackUrl?: string;
};
declare function serializeTransaction({ transaction }: {
    transaction: NearTransaction;
}): string;
declare const PROVIDER_EVENTS: {
    readonly accountsChanged: "accountsChanged";
    readonly networkChanged: "networkChanged";
    readonly message: "message";
    readonly message_low_level: "message_low_level";
    readonly initialized: "near#initialized";
    readonly connect: "connect";
    readonly disconnect: "disconnect";
    readonly chainChanged: "chainChanged";
    readonly unlockChanged: "unlockChanged";
};
export type PROVIDER_EVENTS_STRINGS = keyof typeof PROVIDER_EVENTS;
type ChargerWalletNearProviderEventsMap = {
    [PROVIDER_EVENTS.accountsChanged]: (payload: NearAccountsChangedPayload) => void;
    [PROVIDER_EVENTS.networkChanged]: (payload: NearNetworkChangedPayload) => void;
    [PROVIDER_EVENTS.chainChanged]: (payload: NearNetworkChangedPayload) => void;
    [PROVIDER_EVENTS.message]: (payload: any) => void;
    [PROVIDER_EVENTS.message_low_level]: (payload: IJsonRpcRequest) => void;
    [PROVIDER_EVENTS.initialized]: (payload?: any) => void;
    [PROVIDER_EVENTS.connect]: (payload?: any) => void;
    [PROVIDER_EVENTS.disconnect]: (payload?: any) => void;
    [PROVIDER_EVENTS.unlockChanged]: (payload: NearUnlockChangedPayload) => void;
};
declare interface ChargerWalletNearProvider {
    on<U extends keyof ChargerWalletNearProviderEventsMap>(event: U, listener: ChargerWalletNearProviderEventsMap[U], context?: any): this;
    emit<U extends keyof ChargerWalletNearProviderEventsMap>(event: U, ...args: Parameters<ChargerWalletNearProviderEventsMap[U]>): boolean;
}
declare class ChargerWalletNearProvider extends ProviderNearBase {
    _enablePageReload?: boolean;
    _connectEagerly?: boolean;
    _authData: NearAccountInfo;
    _authDataKey: string;
    _account?: ChargerWalletWalletAccount | null;
    _connection: NearConnection;
    _networkId: string;
    _selectedNetwork: NearNetworkChangedPayload;
    _transactionCreator: TransactionCreator;
    _isInstalled: boolean;
    _isInstalledDetected: boolean;
    _isUnlocked: boolean;
    constructor({ connection, networkId, enablePageReload, connectEagerly, timeout, logger, keyPrefix, transactionCreator, bridge, maxEventListeners, }?: ChargerWalletNearWalletProps);
    _initializedEmitted: boolean;
    detectWalletInstalled(): Promise<boolean>;
    _registerEvents(): void;
    _handleMessageNotificationEvent(payload: any): void;
    _handleBridgeDisconnect(): void;
    isAccountsChanged(account: NearAccountInfo | undefined): boolean;
    _handleAccountsChanged(payload: NearAccountsChangedPayload, { emit }?: {
        emit?: boolean | undefined;
    }): void;
    isNetworkChanged(networkId: string): boolean;
    _handleNetworkChanged(payload: NearNetworkChangedPayload, { emit }?: {
        emit?: boolean | undefined;
    }): void;
    _handleUnlockStateChanged(payload: NearUnlockChangedPayload): void;
    _initAuthDataFromStorage(): void;
    _removeCallbackUrlParams(): void;
    _reloadPage({ url, query }?: {
        url?: string;
        query?: Record<string, any> | unknown;
    }): void;
    _callBridgeRequest(payload: any): Promise<unknown>;
    isInstalled(): boolean;
    isUnlocked(): boolean;
    isSignedIn(): boolean;
    getAccountId(): string;
    getPublicKey(): string;
    getAccountInfo(): NearAccountInfo;
    getNetworkInfo(): NearNetworkInfo;
    _saveAuthData(data: NearAccountInfo): void;
    requestSignIn(signInOptions?: SignInOptions): Promise<SignInResult>;
    requestSignTransactions(signTransactionsOptions: SignTransactionsOptions): Promise<SignTransactionsResult>;
    requestSignMessages({ messages, meta, }: SignMessagesOptions): Promise<SignMessagesResult>;
    request({ method, params }?: IJsonRpcRequest): Promise<unknown>;
    sendJsonRpc(method: string, params: object): Promise<unknown>;
    createTransaction({ receiverId, actions, nonceOffset }: CreateTransactionOptions): Promise<transactions.Transaction>;
    _clearAuthData(): void;
    signOut(): void;
    account(): ChargerWalletWalletAccount;
}
declare class ChargerWalletWalletAccount extends Account {
    _wallet: ChargerWalletNearProvider;
    constructor({ wallet, connection, accountId }: ChargerWalletWalletAccountProps);
    signAndSendTransaction(signAndSendTransactionOptions: SignAndSendTransactionOptions): Promise<FinalExecutionOutcome>;
    getAccessKeys(): Promise<AccessKeyInfoView[]>;
    _fetchAccountAccessKey({ publicKey, accountId }: {
        publicKey: string;
        accountId: string;
    }): Promise<{
        accessKey: import("near-api-js/lib/providers/provider").AccessKeyView;
        publicKey: string;
        accountId: string;
    }>;
    createTransaction({ receiverId, actions, nonceOffset, }: CreateTransactionOptions): Promise<NearTransaction>;
}
export { ChargerWalletNearProvider, ChargerWalletWalletAccount, serializeTransaction };
