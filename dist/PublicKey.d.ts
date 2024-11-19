export declare enum KeyType {
    ED25519 = 0
}
export declare class PublicKey {
    keyType: KeyType;
    data: Uint8Array;
    constructor({ keyType, data }: {
        keyType: KeyType;
        data: Uint8Array;
    });
    static from(value: string | PublicKey): PublicKey;
    static fromString(encodedKey: string): PublicKey;
    toString(): string;
    verify(message: Uint8Array, signature: Uint8Array): boolean;
}
