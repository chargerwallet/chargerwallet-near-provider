"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicKey = exports.KeyType = void 0;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const borsh_1 = require("borsh");
var KeyType;
(function (KeyType) {
    KeyType[KeyType["ED25519"] = 0] = "ED25519";
})(KeyType = exports.KeyType || (exports.KeyType = {}));
function key_type_to_str(keyType) {
    switch (keyType) {
        case KeyType.ED25519:
            return 'ed25519';
        default:
            throw new Error(`Unknown key type ${keyType}`);
    }
}
function str_to_key_type(keyType) {
    switch (keyType.toLowerCase()) {
        case 'ed25519': return KeyType.ED25519;
        default: throw new Error(`Unknown key type ${keyType}`);
    }
}
class PublicKey {
    constructor({ keyType, data }) {
        this.keyType = keyType;
        this.data = data;
    }
    static from(value) {
        if (typeof value === 'string') {
            return PublicKey.fromString(value);
        }
        return value;
    }
    static fromString(encodedKey) {
        const parts = encodedKey.split(':');
        if (parts.length === 1) {
            return new PublicKey({ keyType: KeyType.ED25519, data: (0, borsh_1.baseDecode)(parts[0]) });
        }
        else if (parts.length === 2) {
            return new PublicKey({ keyType: str_to_key_type(parts[0]), data: (0, borsh_1.baseDecode)(parts[1]) });
        }
        else {
            throw new Error('Invalid encoded key format, must be <curve>:<encoded key>');
        }
    }
    toString() {
        return `${key_type_to_str(this.keyType)}:${(0, borsh_1.baseEncode)(this.data)}`;
    }
    verify(message, signature) {
        switch (this.keyType) {
            case KeyType.ED25519:
                return tweetnacl_1.default.sign.detached.verify(message, signature, this.data);
            default:
                throw new Error(`Unknown key type ${this.keyType}`);
        }
    }
}
exports.PublicKey = PublicKey;
