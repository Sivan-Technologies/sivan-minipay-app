# Buy cNGN

The Swap screen has a Buy cNGN tab backed by Sivan Payment's Textile Ramp proxy.

Required deployment settings:

- MiniPay `VITE_PAYMENT_API_URL`: the payment backend base URL, without a trailing slash.
- MiniPay `VITE_TEXTILE_TERMS_URL`: the provider's HTTPS terms page shown before consent.
- Payment `TEXTILE_CREDIT_API_URL`: the Textile API base ending in `/v2` (an existing `/v2/ramp` value is also accepted).

No provider API key is included in browser requests. Ramp uses wallet-signed proof of control, as required by Textile. The backend checks provider chain support and current verified KYC with `canDeposit` before creating a buy transfer.

First use collects a customer profile, then a national ID image and selfie. Pending reviews have a refresh action and periodic checks while the page remains open. Returning verified users enter naira amounts and receive provider bank instructions, target cNGN and fees. Claim tokens and retry references live in session storage scoped to wallet and chain. Reopening the tab in that browser session resumes the purchase. Clearing browser storage loses that local recovery information.

The provider's advertised chains determine availability. Celo support must be verified against the configured provider; no alternate chain is selected automatically.

Validation so far uses mocked provider responses and local builds. No real customer registration, document submission, bank account creation or payment was performed. Live deployment and wallet/browser acceptance testing remain separate steps.

Existing RFQ swap execution is unchanged by this feature and still needs the previously identified settlement verification work.
