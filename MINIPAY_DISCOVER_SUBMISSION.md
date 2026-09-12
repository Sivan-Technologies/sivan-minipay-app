# MiniPay Discover Listing Submission Guide & Production Dossier

## 1. Submission Overview & Official Portal
- Submission Portal: https://developer.minipay.to/mini-app-listing
- Primary Network: Celo Mainnet (Chain ID 42220)
- Testing Network: Celo Sepolia (Chain ID 11142220)
- Ecosystem Registration: Celo Mainnet ERC-8004 Agent Token ID #9827
- Official Attribution Tag: celo_bafcc2e56bd7

---

## 2. Listing Fields (Copy-Paste Ready)

### App Name
Sivan Ai

### Tagline
Autonomous Web3 Service Agreements, stablecoin transfers, and instant Nigerian bank settlement on Celo.

### Category
finance

### Publisher / Organization
Sivan Technology (Abuja, Nigeria)

### Founder & Engineering Lead
- Samson Micheal (Founder, CEO & Product Engineer, Abuja, Nigeria)
- Email: airspexta@gmail.com / sivantechnology@gmail.com
- Telegram: @airspexta

### Co-Founder & Operations Lead
- Jonathan Hart (Co-Founder & Head of Operations / Growth)
- Email: spextaroxy@gmail.com
- GitHub: hart234-cyber

### Public Production App URL (linkUrl)
https://minipay.sivantech.online

### Staging Preview URL (for Testing & Developer Mode)
https://minipay-staging.sivantech.online

### Official Icon (512x512px)
https://minipay.sivantech.online/minipay-icon-512.png
(Stored locally in public/minipay-icon-512.png)

### Dedicated Support URL
https://t.me/Sivan_Ai

### Support Email
support@sivantech.online

### Terms of Service URL
https://sivantech.online/terms
(Also accessible directly in-app via the Legal & Support drawer)

### Privacy Policy URL
https://sivantech.online/privacy
(Also accessible directly in-app via the Legal & Support drawer)

---

## 3. Technical Requirements Compliance Audit

### 1. Auto-Connect on Load (Passed)
- File: src/services/minipay.service.ts
- Verification: The detectEnvironment() lifecycle automatically requests accounts on load via window.ethereum (eth_requestAccounts). MiniPay users land directly on the active dashboard without ever seeing a "Connect Wallet" button.

### 2. HTTPS & Edge Deployment (Passed)
- Live production and staging domains are served over TLS 1.3 with Cloudflare edge proxying and Vercel CDN infrastructure.

### 3. Mobile Viewport & Touch Target Standards (Passed)
- Minimum Viewport: 360x640px compliant (full responsive single-column layout).
- Touch Targets: All buttons, pills, tiles, and navigation items meet the minimum 44x44px touch area standard.
- Native Theme: Supports dark mode with meta color-scheme="dark" and theme-color="#0a0e17".

### 4. Non-Jargon Language & Terminology (Passed)
- File: src/components/CashoutView.ts & DashboardView.ts
- Terminology Audit:
  - Uses "Cash Out" and "Withdraw" instead of "off-ramp" or "sell".
  - Uses "Deposit" and "Transfer" instead of "on-ramp" or "buy".
  - Uses "Network Fee" instead of "gas".
  - Uses "Digital Dollar (USDC / USDT)" and "cNGN" instead of "crypto tokens".

### 5. Dependency Supply-Chain Security (Passed)
- Exact Pinned Versions (package.json):
  - typescript: 6.0.3 (exact, no ranges)
  - vite: 8.3.0 (exact, no ranges)
  - @celo/attribution-tags: 0.3.0 (exact, no ranges)
  - viem: 2.56.3 (exact, no ranges)
- Supply Chain Rules (.npmrc):
  - ignore-scripts=true (prevents malicious postinstall scripts)
  - minimum-release-age=10080 (requires 7-day package maturity before installation)
- Developer Tunneling (vite.config.ts):
  - Configured allowedHosts for ngrok tunnels (.ngrok.app, .ngrok-free.dev, .ngrok-free.app).

---

## 4. Network Manifest (Full List of External Domains & APIs)

MiniPay requires declaring all origins and APIs contacted by the Mini App:

1. https://api.sivantech.online
   - Sivan Payment microservice gateway (quotes, fee rules, bank routing)
2. https://api-staging.sivantech.online
   - Staging gateway for developer preview and integration testing
3. https://forno.celo.org
   - Celo Mainnet public RPC endpoint
4. https://alfajores-forno.celo-testnet.org
   - Celo Sepolia / Alfajores testnet RPC endpoint
5. https://api.textilecredit.com
   - Textile Credit / Busha NIBSS corridor partner for instant Nigerian bank settlement
6. https://fonts.googleapis.com & https://fonts.gstatic.com
   - Typography and UI styling assets

---

## 5. Smart Contracts & Celo Ecosystem Verification

### 1. ERC-8004 AI Agent Registry
- Registry URL: https://8004scan.io/agents/celo/9827
- Agent Token ID: #9827
- Agent Name: Sivan AI
- Registered Agent Wallet: 0x4a1A9cf30A86b2b333D1a743181aAE71a50BAFBc

### 2. Celo Foundation Attribution
- Attribution Tag: celo_bafcc2e56bd7
- Package: @celo/attribution-tags
- Calldata Suffix: Automatically attached to every on-chain transfer and service agreement creation to ensure verified tracking on Celoscan.

### 3. Celo Stablecoin Tokens Supported
- USDC (Celo Mainnet): 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
- USDT (Celo Mainnet): 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
- cUSD (Celo Mainnet): 0x765DE816845861e75A25fCA122bb6898B8B1282a
- cNGN (Celo Mainnet): Local Nigerian digital Naira settlement token

---

## 6. Service Level Agreement (SLA) & Incident Response Policy

In compliance with MiniPay Discover requirements:
- Dedicated Support Channels: Telegram community (@Sivan_Ai) and Official Email (support@sivantech.online).
- Critical Issue Resolution Guarantee: All critical bugs, payment delays, or settlement inquiries reported via in-app support or MiniPay team will be diagnosed and addressed within 24 hours.
- Clear Ownership Disclaimer: Displayed visibly in-app and in documentation that Sivan Ai is operated independently by Sivan Technology (Abuja, Nigeria) and is not operated by or affiliated with Opera Software or MiniPay.
