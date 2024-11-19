import { IInjectedProviderNames } from '@chargerwallet/cross-inpage-provider-types';
import { ProviderBase } from '@chargerwallet/cross-inpage-provider-core';
class ProviderNearBase extends ProviderBase {
    constructor(props) {
        super(props);
        this.providerName = IInjectedProviderNames.near;
    }
    request(data) {
        return this.bridgeRequest(data);
    }
}
export { ProviderNearBase };
