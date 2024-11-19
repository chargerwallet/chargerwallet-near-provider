import nacl from 'tweetnacl';
import { baseDecode, baseEncode } from 'borsh';
export var KeyType;
(function (KeyType) {
    KeyType[KeyType["ED25519"] = 0] = "ED25519";
})(KeyType || (KeyType = {}));
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
export class PublicKey {
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
            return new PublicKey({ keyType: KeyType.ED25519, data: baseDecode(parts[0]) });
        }
        else if (parts.length === 2) {
            return new PublicKey({ keyType: str_to_key_type(parts[0]), data: baseDecode(parts[1]) });
        }
        else {
            throw new Error('Invalid encoded key format, must be <curve>:<encoded key>');
        }
    }
    toString() {
        return `${key_type_to_str(this.keyType)}:${baseEncode(this.data)}`;
    }
    verify(message, signature) {
        switch (this.keyType) {
            case KeyType.ED25519:
                return nacl.sign.detached.verify(message, signature, this.data);
            default:
                throw new Error(`Unknown key type ${this.keyType}`);
        }
    }
}
