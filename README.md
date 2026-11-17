# LicenseCourt frontend (Next.js 15 + genlayer-js)

A Vercel-ready frontend for the LicenseCourt intelligent contract
(`0x06a852688E326D0596E786519E15168AE16C98B4`, GenLayer Studio, chain 61999).

Reads (`get_audit_count`, `get_audit`, `get_claim_count`, `get_claim`,
`get_violation_count`) are free and need no wallet. Writes
(`create_audit`, `submit_claim`, `assess_claim`) go through MetaMask and
wait for consensus in the browser — deliberately **not** behind a Vercel
serverless function, because a triage takes minutes and free serverless
functions time out. The contract itself stays on GenLayer; only this
frontend is hosted on Vercel.

## Deploy to Vercel

1. Push this folder to a GitHub repo (or import the folder directly).
2. In Vercel: **Add New → Project → Import** the repo. Framework preset:
   Next.js (auto-detected).
3. Environment variables (Production):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_GENLAYER_RPC_URL` | `https://studio.genlayer.com/api` |
   | `NEXT_PUBLIC_GENLAYER_CHAIN_ID` | `61999` |
   | `NEXT_PUBLIC_GENLAYER_CHAIN_NAME` | `GenLayer Studio` |
   | `NEXT_PUBLIC_GENLAYER_SYMBOL` | `GEN` |
   | `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x06a852688E326D0596E786519E15168AE16C98B4` |

4. Click **Deploy**. No build settings to change.

## Local check

```bash
npm install
cp .env.example .env.local   # then fill in if needed
npm run dev                  # http://localhost:3000
```

In MetaMask, add the GenLayer Studio network (chain ID 61999, RPC
`https://studio.genlayer.com/api`) and import a Studio test account with
GEN tokens before trying writes.

## Notes / limits

- The contract is on the **Studio test environment**, not a production
  testnet (Asimov/Bradbury). To move later: redeploy the contract there
  and change only the RPC/chain env vars.
- Example audit URLs that validators can fetch live in the contract repo
  under `examples/` (`license_manifest.json`, `license_index.md`,
  `license_exceptions.md` on the main branch raw links).
- Only the audit owner can close/reopen an audit, and the owner cannot
  submit claims on their own audit — the UI does not offer those actions
  yet.
