# ProofNest Vault deployment

Deploy `ProofNestVault.sol` first to the **Sepolia test network** using Remix and a wallet with Sepolia test ETH. Do not use mainnet until the contract has been independently reviewed.

The contract supports:

- `deposit()` — locks ETH under the sender's wallet address.
- `transfer(address,uint256)` — moves ledger balance to another vault user.
- `withdraw(uint256)` — lets the caller withdraw only their own available balance.

After deployment, add the deployed contract address to the web DApp configuration before enabling the vault user interface.
