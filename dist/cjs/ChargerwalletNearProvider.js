"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeTransaction = exports.ChargerWalletWalletAccount = exports.ChargerWalletNearProvider = void 0;
const depd_1 = __importDefault(require("depd"));
const extension_bridge_injected_1 = require("@chargerwallet/extension-bridge-injected");
const cross_inpage_provider_errors_1 = require("@chargerwallet/cross-inpage-provider-errors");
const entries_1 = __importDefault(require("lodash/entries"));
const isString_1 = __importDefault(require("lodash/isString"));
const borsh_1 = require("borsh");
const near_api_js_1 = require("near-api-js");
const ProviderNearBase_1 = require("./ProviderNearBase");
function serializeTransaction({ transaction }) {
    if ((0, isString_1.default)(transaction)) {
        return transaction;
    }
    const message = transaction.encode();
    // const hash = new Uint8Array(sha256.sha256.array(message));
    if (typeof Buffer !== 'undefined' && Buffer.from) {
        return Buffer.from(message).toString('base64');
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return message.toString('base64');
}
exports.serializeTransaction = serializeTransaction;
const DEFAULT_AUTH_DATA = {
    accountId: '',
    publicKey: '',
    allKeys: [],
};
const DEFAULT_NETWORK_INFO = {
    networkId: '',
    nodeUrls: [],
};
const PROVIDER_METHODS = {
    near_accounts: 'near_accounts',
    near_network: 'near_network',
    near_networkInfo: 'near_networkInfo',
    near_requestAccounts: 'near_requestAccounts',
    near_requestSignIn: 'near_requestSignIn',
    near_signOut: 'near_signOut',
    near_requestSignTransactions: 'near_requestSignTransactions',
    near_sendTransactions: 'near_sendTransactions',
    near_signTransactions: 'near_signTransactions',
    near_signMessages: 'near_signMessages',
    near_requestSignMessages: 'near_requestSignMessages',
};
const PROVIDER_EVENTS = {
    accountsChanged: 'accountsChanged',
    networkChanged: 'networkChanged',
    message: 'message',
    message_low_level: 'message_low_level',
    initialized: 'near#initialized',
    // legacy events
    connect: 'connect',
    disconnect: 'disconnect',
    chainChanged: 'chainChanged',
    unlockChanged: 'unlockChanged',
};
function isWalletEventMethodMatch({ method, name }) {
    return method === `metamask_${name}` || method === `wallet_events_${name}`;
}
function defaultTransactionCreator({ accountId, publicKey, receiverId, nonce, actions, blockHash, }) {
    const publicKeyBuffer = near_api_js_1.utils.PublicKey.fromString(publicKey);
    return near_api_js_1.transactions.createTransaction(accountId, publicKeyBuffer, receiverId, nonce, actions, blockHash);
}
// TODO check methods return type match official web wallet
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
class ChargerWalletNearProvider extends ProviderNearBase_1.ProviderNearBase {
    // TODO package.json version (process.env.npm_package_version)
    constructor({ connection, networkId, enablePageReload, connectEagerly = true, timeout, logger, keyPrefix = '', transactionCreator, bridge, maxEventListeners, } = {}) {
        super({
            bridge: bridge || (0, extension_bridge_injected_1.getOrCreateExtInjectedJsBridge)({ timeout }),
            logger,
            maxEventListeners,
        });
        this._enablePageReload = false;
        this._connectEagerly = true;
        this._authData = DEFAULT_AUTH_DATA;
        this._authDataKey = '@ChargerWalletNearWalletAuthData';
        this._networkId = '';
        this._selectedNetwork = DEFAULT_NETWORK_INFO;
        this._isInstalled = false;
        this._isInstalledDetected = false;
        this._isUnlocked = false;
        this._initializedEmitted = false;
        if (!networkId) {
            // throw new Error('ChargerWalletNearWallet init error: networkId required.');
        }
        this._authDataKey = keyPrefix + this._authDataKey;
        this._enablePageReload = enablePageReload;
        this._connectEagerly = connectEagerly;
        this._connection = connection;
        this._networkId = networkId || '';
        this._transactionCreator = transactionCreator || defaultTransactionCreator;
        this._initAuthDataFromStorage();
        this._registerEvents();
        void this.detectWalletInstalled().then(() => {
            this._removeCallbackUrlParams();
        });
    }
    detectWalletInstalled() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isInstalledDetected) {
                return this._isInstalled;
            }
            const walletInfo = yield this.getConnectWalletInfo();
            const isInstalled = Boolean(walletInfo);
            if (isInstalled) {
                const providerState = walletInfo === null || walletInfo === void 0 ? void 0 : walletInfo.providerState;
                if ((providerState === null || providerState === void 0 ? void 0 : providerState.accounts) && this._connectEagerly) {
                    this._handleAccountsChanged({
                        accounts: providerState.accounts || [],
                    }, { emit: false });
                }
                if (providerState === null || providerState === void 0 ? void 0 : providerState.network) {
                    this._handleNetworkChanged(providerState.network, { emit: false });
                }
            }
            this._isInstalled = isInstalled;
            this._isInstalledDetected = true;
            if (!isInstalled && this.isSignedIn()) {
                this._handleAccountsChanged({
                    accounts: [],
                }, { emit: false });
            }
            if (isInstalled && !this._initializedEmitted) {
                this._initializedEmitted = true;
                window.dispatchEvent(new Event(PROVIDER_EVENTS.initialized));
                this.emit(PROVIDER_EVENTS.initialized);
                this.emit(PROVIDER_EVENTS.connect);
            }
            return isInstalled;
        });
    }
    _registerEvents() {
        window.addEventListener('chargerwallet_bridge_disconnect', () => {
            this._handleBridgeDisconnect();
        });
        this.on(PROVIDER_EVENTS.message_low_level, (payload) => {
            const { method, params } = payload;
            if (
            // wallet_events_accountsChanged
            isWalletEventMethodMatch({
                method,
                name: 'accountsChanged',
            })) {
                this._handleAccountsChanged(params);
            }
            else if (isWalletEventMethodMatch({
                method,
                name: 'unlockStateChanged',
            })) {
                this._handleUnlockStateChanged(params);
            }
            else if (
            // wallet_events_chainChanged
            isWalletEventMethodMatch({
                method,
                name: 'chainChanged',
            }) ||
                isWalletEventMethodMatch({
                    method,
                    name: 'networkChanged',
                })) {
                this._handleNetworkChanged(params);
            }
            else if (
            // wallet_events_message
            isWalletEventMethodMatch({
                method,
                name: 'message',
            })) {
                this._handleMessageNotificationEvent(params);
            }
        });
    }
    _handleMessageNotificationEvent(payload) {
        this.emit(PROVIDER_EVENTS.message, payload);
    }
    _handleBridgeDisconnect() {
        this._handleAccountsChanged({
            accounts: [],
        });
        this._handleNetworkChanged(DEFAULT_NETWORK_INFO);
        this._isInstalled = false;
        this.emit(PROVIDER_EVENTS.disconnect);
    }
    isAccountsChanged(account) {
        return (account === null || account === void 0 ? void 0 : account.accountId) !== this.getAccountId();
    }
    _handleAccountsChanged(payload, { emit = true } = {}) {
        const accounts = (payload === null || payload === void 0 ? void 0 : payload.accounts) || [];
        const account = accounts === null || accounts === void 0 ? void 0 : accounts[0];
        const hasAccount = account && (account === null || account === void 0 ? void 0 : account.accountId);
        if (hasAccount && this.isAccountsChanged(account)) {
            this._saveAuthData(account);
            emit && this.emit(PROVIDER_EVENTS.accountsChanged, payload);
        }
        else if (!hasAccount && this.isSignedIn()) {
            this._clearAuthData();
            emit && this.emit(PROVIDER_EVENTS.accountsChanged, { accounts: [] });
        }
    }
    isNetworkChanged(networkId) {
        var _a;
        return networkId !== ((_a = this._selectedNetwork) === null || _a === void 0 ? void 0 : _a.networkId);
    }
    _handleNetworkChanged(payload, { emit = true } = {}) {
        if (payload && this.isNetworkChanged(payload.networkId)) {
            this._selectedNetwork = payload;
            emit && this.emit(PROVIDER_EVENTS.networkChanged, payload);
            emit && this.emit(PROVIDER_EVENTS.chainChanged, payload);
        }
    }
    _handleUnlockStateChanged(payload) {
        const isUnlocked = payload === null || payload === void 0 ? void 0 : payload.isUnlocked;
        if (typeof isUnlocked !== 'boolean') {
            // TODO log same error only once
            console.error('Received invalid isUnlocked parameter. Please report this bug.');
            return;
        }
        if (isUnlocked !== this._isUnlocked) {
            this._isUnlocked = isUnlocked;
            this.emit(PROVIDER_EVENTS.unlockChanged, payload);
        }
    }
    _initAuthDataFromStorage() {
        try {
            const data = localStorage.getItem(this._authDataKey);
            const authData = (data ? JSON.parse(data) : null);
            if (authData) {
                this._authData = authData;
            }
            else {
                this._authData = DEFAULT_AUTH_DATA;
            }
        }
        catch (e) {
            this._authData = DEFAULT_AUTH_DATA;
        }
    }
    //  similar to WalletConnection._completeSignInWithAccessKey
    _removeCallbackUrlParams() {
        try {
            if (this._enablePageReload) {
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.delete('public_key');
                currentUrl.searchParams.delete('all_keys');
                currentUrl.searchParams.delete('account_id');
                currentUrl.searchParams.delete('meta');
                currentUrl.searchParams.delete('transactionHashes');
                window.history.replaceState({}, document.title, currentUrl.toString());
            }
        }
        catch (err) {
            //noop
        }
    }
    _reloadPage({ url, query = {} } = {}) {
        if (this._enablePageReload) {
            if (url) {
                const urlObj = new URL(url);
                (0, entries_1.default)(query).forEach(([k, v]) => {
                    if (Array.isArray(v)) {
                        v = v.join(',');
                    }
                    urlObj.searchParams.set(k, v);
                });
                window.location.assign(urlObj.toString());
            }
            else {
                window.location.reload();
            }
        }
    }
    _callBridgeRequest(payload) {
        var _a;
        if (!this.isInstalled()) {
            // const error = web3Errors.provider.custom({ code, message })
            const error = cross_inpage_provider_errors_1.web3Errors.provider.disconnected();
            throw error;
        }
        return this.bridgeRequest(Object.assign(Object.assign({}, payload), { requestInfo: {
                accountId: this.getAccountId(),
                publicKey: this.getPublicKey(),
                networkId: this._networkId,
                selectedNetworkId: ((_a = this.getNetworkInfo()) === null || _a === void 0 ? void 0 : _a.networkId) || '',
            } }));
    }
    isInstalled() {
        return this._isInstalled;
    }
    isUnlocked() {
        return this._isUnlocked;
    }
    isSignedIn() {
        return !!this.getAccountId();
    }
    getAccountId() {
        var _a;
        return ((_a = this._authData) === null || _a === void 0 ? void 0 : _a.accountId) || '';
    }
    getPublicKey() {
        var _a;
        return ((_a = this._authData) === null || _a === void 0 ? void 0 : _a.publicKey) || '';
    }
    getAccountInfo() {
        return this._authData || DEFAULT_AUTH_DATA;
    }
    getNetworkInfo() {
        return this._selectedNetwork || DEFAULT_NETWORK_INFO;
    }
    _saveAuthData(data) {
        localStorage.setItem(this._authDataKey, JSON.stringify(data));
        this._initAuthDataFromStorage();
    }
    requestSignIn(signInOptions = {}) {
        return __awaiter(this, arguments, void 0, function* () {
            let options;
            if (typeof signInOptions === 'string') {
                const contractId = signInOptions;
                const deprecate = (0, depd_1.default)('requestSignIn(contractId, title)');
                deprecate('`title` ignored; use `requestSignIn({ contractId, successUrl, failureUrl })` instead');
                // eslint-disable-next-line prefer-rest-params
                const successUrl = arguments[2];
                // eslint-disable-next-line prefer-rest-params
                const failureUrl = arguments[3];
                options = {
                    contractId,
                    methodNames: [],
                    successUrl,
                    failureUrl,
                };
            }
            else {
                options = signInOptions;
            }
            const res = (yield this._callBridgeRequest({
                method: PROVIDER_METHODS.near_requestSignIn,
                params: [options],
            }));
            const accounts = (res === null || res === void 0 ? void 0 : res.accounts) || [];
            const account = accounts === null || accounts === void 0 ? void 0 : accounts[0];
            if (account && account.accountId) {
                this._handleAccountsChanged({
                    accounts: accounts.filter(Boolean),
                });
                this._reloadPage({
                    url: options.successUrl || window.location.href,
                    query: {
                        account_id: account.accountId,
                        public_key: account.publicKey,
                        all_keys: account.allKeys,
                    },
                });
            }
            else {
                this._handleAccountsChanged({
                    accounts: [],
                });
                this._reloadPage({
                    url: options.failureUrl || window.location.href,
                    query: DEFAULT_AUTH_DATA,
                });
            }
            return res;
        });
    }
    // TODO check if account is activated on chain, and show ApprovalPopup message
    //      DO NOT allow inactivated account approve connection
    requestSignTransactions(signTransactionsOptions) {
        return __awaiter(this, arguments, void 0, function* () {
            // eslint-disable-next-line prefer-rest-params
            const args = arguments;
            let options = signTransactionsOptions;
            if (Array.isArray(args[0])) {
                const deprecate = (0, depd_1.default)('WalletConnection.requestSignTransactions(transactions, callbackUrl, meta)');
                deprecate('use `WalletConnection.requestSignTransactions(RequestSignTransactionsOptions)` instead');
                options = {
                    transactions: args[0],
                    callbackUrl: args[1],
                    meta: args[2],
                };
            }
            const { transactions = [], callbackUrl = window.location.href, meta = {}, send = true, } = options;
            const txSerialized = transactions.map((tx) => serializeTransaction({
                transaction: tx,
            }));
            // sign and send
            const res = yield this._callBridgeRequest({
                method: PROVIDER_METHODS.near_requestSignTransactions,
                params: [{ transactions: txSerialized, meta, send }],
            });
            this._reloadPage({
                url: callbackUrl,
                query: res,
            });
            return res;
        });
    }
    requestSignMessages({ messages = [], meta = {}, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this._callBridgeRequest({
                method: PROVIDER_METHODS.near_requestSignMessages,
                params: [{ messages, meta }],
            });
            return res;
        });
    }
    // TODO requestBatch
    request({ method, params } = { method: '', params: [] }) {
        return __awaiter(this, void 0, void 0, function* () {
            const paramsArr = [].concat(params);
            const paramObj = paramsArr[0];
            if (method === PROVIDER_METHODS.near_network) {
                method = PROVIDER_METHODS.near_networkInfo;
            }
            if (method === PROVIDER_METHODS.near_requestAccounts ||
                method === PROVIDER_METHODS.near_requestSignIn) {
                return this.requestSignIn(paramObj);
            }
            if (method === PROVIDER_METHODS.near_sendTransactions ||
                method === PROVIDER_METHODS.near_requestSignTransactions ||
                method === PROVIDER_METHODS.near_signTransactions // sign only, do not send
            ) {
                const options = paramObj;
                const optionsNew = Object.assign({}, options);
                optionsNew.send = method !== PROVIDER_METHODS.near_signTransactions;
                return this.requestSignTransactions(optionsNew);
            }
            if (method === PROVIDER_METHODS.near_signMessages ||
                method === PROVIDER_METHODS.near_requestSignMessages) {
                return this.requestSignMessages(paramObj);
            }
            if (method === PROVIDER_METHODS.near_signOut) {
                return this.signOut();
            }
            return yield this._callBridgeRequest({
                method,
                params,
            });
        });
    }
    sendJsonRpc(method, params) {
        const provider = this._connection.provider;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
        return provider.sendJsonRpc(method, params);
    }
    createTransaction({ receiverId, actions, nonceOffset = 1 }) {
        return this.account().createTransaction({
            receiverId,
            actions,
            nonceOffset,
        });
    }
    _clearAuthData() {
        localStorage.setItem(this._authDataKey, '');
        this._account = null;
        this._initAuthDataFromStorage();
    }
    signOut() {
        void this._callBridgeRequest({
            method: PROVIDER_METHODS.near_signOut,
            params: this._authData,
        });
        this._handleAccountsChanged({ accounts: [] });
        // signOut() in near web wallet does not reload page
        // this._reloadPage();
    }
    account() {
        const accountId = this.getAccountId();
        if (!this._account || this._account.accountId !== accountId) {
            this._account = new ChargerWalletWalletAccount({
                wallet: this,
                connection: this._connection,
                accountId,
            });
        }
        return this._account;
    }
}
exports.ChargerWalletNearProvider = ChargerWalletNearProvider;
class ChargerWalletWalletAccount extends near_api_js_1.Account {
    constructor({ wallet, connection, accountId }) {
        super(connection, accountId);
        this._wallet = wallet;
    }
    // TODO
    // state()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    signAndSendTransaction(signAndSendTransactionOptions) {
        var _a;
        return __awaiter(this, arguments, void 0, function* () {
            let options = signAndSendTransactionOptions;
            // eslint-disable-next-line prefer-rest-params
            const args = arguments;
            if (typeof args[0] === 'string') {
                options = {
                    receiverId: args[0],
                    actions: args[1],
                };
            }
            // TODO walletMeta, walletCallbackUrl
            const { receiverId, actions, meta, callbackUrl } = options;
            const transaction = yield this.createTransaction({
                receiverId,
                actions,
            });
            const txHashList = yield this._wallet.requestSignTransactions({
                transactions: [transaction],
                meta,
                callbackUrl,
            });
            const txHash = (_a = txHashList === null || txHashList === void 0 ? void 0 : txHashList.transactionHashes) === null || _a === void 0 ? void 0 : _a[0];
            if (txHash) {
                // near-api-js/lib/providers/json-rpc-provider.js
                //    async txStatus(txHash, accountId)
                const txHashStr = typeof txHash === 'string' ? txHash : (0, borsh_1.baseEncode)(txHash);
                const res = (yield this._wallet.request({
                    method: 'tx',
                    params: [txHashStr, this.accountId],
                }));
                return res;
            }
            throw cross_inpage_provider_errors_1.web3Errors.rpc.internal({
                message: 'Transaction sign and send failed: transactionHash not found',
            });
        });
    }
    getAccessKeys() {
        return __awaiter(this, void 0, void 0, function* () {
            // near-api-js/lib/account.js
            //    async getAccessKeys() { ... }
            const response = yield this._wallet.request({
                method: 'query',
                params: {
                    request_type: 'view_access_key_list',
                    account_id: this.accountId,
                    finality: 'optimistic',
                },
            });
            // A breaking API change introduced extra information into the
            // response, so it now returns an object with a `keys` field instead
            // of an array: https://github.com/nearprotocol/nearcore/pull/1789
            if (Array.isArray(response)) {
                return response;
            }
            return response.keys;
        });
    }
    _fetchAccountAccessKey({ publicKey, accountId }) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = yield this.getAccessKeys();
            const keyInfo = keys.find((item) => item.public_key === publicKey);
            if (keyInfo && keyInfo.access_key) {
                const accessKey = keyInfo.access_key;
                return {
                    accessKey,
                    publicKey,
                    accountId,
                };
            }
            throw new Error(`near account access key not found for: ${accountId}`);
        });
    }
    createTransaction({ receiverId, actions, nonceOffset = 1, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const _authData = this._wallet._authData;
            const publicKey = _authData.publicKey;
            const accountId = _authData.accountId;
            if (!accountId) {
                const error = cross_inpage_provider_errors_1.web3Errors.provider.unauthorized();
                throw error;
            }
            const accessKeyInfo = yield this._fetchAccountAccessKey({
                accountId,
                publicKey,
            });
            const nonce = accessKeyInfo.accessKey.nonce + nonceOffset;
            // near-api-js/lib/providers/json-rpc-provider.js
            //    async block(blockQuery) {...}
            const block = (yield this._wallet.request({
                method: 'block',
                params: { block_id: undefined, finality: 'final' },
            }));
            const blockHash = (0, borsh_1.baseDecode)(block.header.hash);
            const transaction = this._wallet._transactionCreator({
                accountId,
                publicKey,
                receiverId,
                nonce,
                actions,
                blockHash,
            });
            return transaction;
        });
    }
}
exports.ChargerWalletWalletAccount = ChargerWalletWalletAccount;
