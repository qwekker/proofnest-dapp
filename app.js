const $ = (id) => document.getElementById(id);
const connectButton = $('connectButton'), signButton = $('signButton'), statement = $('statement');
let walletAddress = '', latestProof = null, moneyAction = 'deposit';
const VAULT_ADDRESS = '0x1edB6Fe8CA5F2B9f86F2DDA725532bd2F60Ad3cC';
const SEPOLIA_CHAIN = '0xaa36a7';

function shortAddress(address) { return `${address.slice(0, 6)}…${address.slice(-4)}`; }
function notify(message) { const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function updateSignState() { signButton.disabled = !walletAddress || !statement.value.trim(); }
function updateMoneyState() { const needsRecipient = moneyAction === 'transfer'; $('moneyButton').disabled = !walletAddress || (needsRecipient && !$('recipient').value.trim()) || !$('amount').value.trim(); }
function fromWei(value) { const amount = BigInt(value); const whole = amount / 10n ** 18n, fraction = (amount % 10n ** 18n).toString().padStart(18, '0').slice(0, 4).replace(/0+$/, ''); return `${whole}${fraction ? `.${fraction}` : ''} ETH`; }
async function refreshVaultBalance() { if (!walletAddress || !window.ethereum) return; try { const data = `0x27e235e3${walletAddress.slice(2).padStart(64, '0')}`; const result = await window.ethereum.request({ method: 'eth_call', params: [{ to: VAULT_ADDRESS, data }, 'latest'] }); $('vaultBalance').textContent = fromWei(result); } catch { $('vaultBalance').textContent = 'Unavailable'; } }
function getProofs() { try { return JSON.parse(localStorage.getItem('proofnest-proofs') || '[]'); } catch { return []; } }
function renderProofs() {
  const records = getProofs(), box = $('records'), clear = $('clearButton'); clear.hidden = !records.length;
  box.innerHTML = records.length ? records.map((proof) => `<article class="record"><p>${escapeHtml(proof.statement)}</p><footer><span>${shortAddress(proof.address)}</span><span>${new Date(proof.createdAt).toLocaleDateString()}</span><span>signed ✓</span></footer></article>`).join('') : '<div class="empty-state"><span>✦</span><p>Your signed intentions will appear here.</p></div>';
}
function escapeHtml(text) { const node = document.createElement('span'); node.textContent = text; return node.innerHTML; }
async function connectWallet() {
  if (!window.ethereum) { notify('Open this DApp inside MetaMask or another wallet browser.'); return; }
  try { const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }); walletAddress = accounts[0]; connectButton.textContent = shortAddress(walletAddress); $('walletHint').textContent = 'Wallet connected'; updateSignState(); updateMoneyState(); refreshVaultBalance(); }
  catch { notify('Wallet connection was cancelled.'); }
}
async function createProof() {
  const text = statement.value.trim(); if (!text || !walletAddress) return;
  const createdAt = new Date().toISOString(); const message = `ProofNest intention\n\n${text}\n\nSigned at: ${createdAt}\nWallet: ${walletAddress}\n\nThis message is a personal proof only. It does not initiate a blockchain transaction.`;
  signButton.disabled = true; signButton.textContent = 'Waiting for signature…';
  try {
    const signature = await window.ethereum.request({ method: 'personal_sign', params: [message, walletAddress] });
    latestProof = { statement: text, address: walletAddress, createdAt, signature };
    localStorage.setItem('proofnest-proofs', JSON.stringify([latestProof, ...getProofs()].slice(0, 20)));
    $('dialogStatement').textContent = `“${text}”`;
    $('dialogMeta').innerHTML = `WALLET  ${shortAddress(walletAddress)}<br>TIME    ${new Date(createdAt).toLocaleString()}<br>SIG     ${signature.slice(0, 18)}…${signature.slice(-10)}`;
    $('proofDialog').showModal(); statement.value = ''; $('counter').textContent = '0 / 240'; renderProofs();
  } catch { notify('Signature was not completed.'); } finally { signButton.textContent = 'Sign this intention →'; updateSignState(); }
}
function toWei(value) { if (!/^\d+(\.\d{1,18})?$/.test(value) || Number(value) <= 0) return null; const [whole, fraction = ''] = value.split('.'); return `0x${(BigInt(whole) * 10n ** 18n + BigInt((fraction + '0'.repeat(18)).slice(0, 18))).toString(16)}`; }
async function sendEth(event) {
  event.preventDefault(); const recipient = $('recipient').value.trim(), amount = $('amount').value.trim(), value = toWei(amount);
  if (moneyAction === 'transfer' && !/^0x[a-fA-F0-9]{40}$/.test(recipient)) return notify('Enter a valid 0x recipient address.'); if (!value) return notify('Enter an amount greater than 0.');
  const button = $('moneyButton'); button.disabled = true; button.textContent = 'Open wallet to confirm…';
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' }); if (chainId !== SEPOLIA_CHAIN) throw new Error('Switch your wallet to Sepolia.');
    let tx;
    if (moneyAction === 'deposit') tx = { from: walletAddress, to: VAULT_ADDRESS, value, data: '0xd0e30db0' };
    else if (moneyAction === 'withdraw') tx = { from: walletAddress, to: VAULT_ADDRESS, data: `0x2e1a7d4d${value.slice(2).padStart(64, '0')}` };
    else tx = { from: walletAddress, to: VAULT_ADDRESS, data: `0xa9059cbb${recipient.slice(2).padStart(64, '0')}${value.slice(2).padStart(64, '0')}` };
    const hash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [tx] }); notify(`${moneyAction[0].toUpperCase() + moneyAction.slice(1)} submitted: ${hash.slice(0, 10)}…`); $('amount').value = ''; setTimeout(refreshVaultBalance, 4000);
  }
  catch (error) { notify(error.message || 'Transaction was not completed.'); }
  catch { notify('Transaction was not completed.'); } finally { button.innerHTML = `${moneyAction === 'deposit' ? 'Deposit ETH' : 'Transfer ETH'} <span>↗</span>`; updateMoneyState(); }
}
connectButton.addEventListener('click', connectWallet); signButton.addEventListener('click', createProof);
statement.addEventListener('input', () => { $('counter').textContent = `${statement.value.length} / 240`; updateSignState(); });
$('moneyForm').addEventListener('submit', sendEth); $('recipient').addEventListener('input', updateMoneyState); $('amount').addEventListener('input', updateMoneyState);
document.querySelectorAll('.action-tab').forEach((tab) => tab.addEventListener('click', () => { moneyAction = tab.dataset.action; document.querySelectorAll('.action-tab').forEach((item) => item.classList.toggle('active', item === tab)); $('recipientGroup').hidden = moneyAction !== 'transfer'; $('moneyButton').innerHTML = `${moneyAction === 'deposit' ? 'Deposit ETH' : moneyAction === 'transfer' ? 'Transfer vault balance' : 'Withdraw ETH'} <span>↗</span>`; updateMoneyState(); }));
$('closeDialog').addEventListener('click', () => $('proofDialog').close());
$('copyButton').addEventListener('click', async () => { if (!latestProof) return; await navigator.clipboard.writeText(JSON.stringify(latestProof, null, 2)); notify('Proof details copied.'); });
$('clearButton').addEventListener('click', () => { localStorage.removeItem('proofnest-proofs'); renderProofs(); notify('Local vault cleared.'); });
if (window.ethereum) window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => { if (accounts[0]) { walletAddress = accounts[0]; connectButton.textContent = shortAddress(walletAddress); $('walletHint').textContent = 'Wallet connected'; updateSignState(); updateMoneyState(); refreshVaultBalance(); } });
renderProofs();
