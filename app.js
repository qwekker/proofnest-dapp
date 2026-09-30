const $ = (id) => document.getElementById(id);
const connectButton = $('connectButton'), signButton = $('signButton'), statement = $('statement');
let walletAddress = '', latestProof = null;

function shortAddress(address) { return `${address.slice(0, 6)}…${address.slice(-4)}`; }
function notify(message) { const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function updateSignState() { signButton.disabled = !walletAddress || !statement.value.trim(); }
function getProofs() { try { return JSON.parse(localStorage.getItem('proofnest-proofs') || '[]'); } catch { return []; } }
function renderProofs() {
  const records = getProofs(), box = $('records'), clear = $('clearButton'); clear.hidden = !records.length;
  box.innerHTML = records.length ? records.map((proof) => `<article class="record"><p>${escapeHtml(proof.statement)}</p><footer><span>${shortAddress(proof.address)}</span><span>${new Date(proof.createdAt).toLocaleDateString()}</span><span>signed ✓</span></footer></article>`).join('') : '<div class="empty-state"><span>✦</span><p>Your signed intentions will appear here.</p></div>';
}
function escapeHtml(text) { const node = document.createElement('span'); node.textContent = text; return node.innerHTML; }
async function connectWallet() {
  if (!window.ethereum) { notify('Open this DApp inside MetaMask or another wallet browser.'); return; }
  try { const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }); walletAddress = accounts[0]; connectButton.textContent = shortAddress(walletAddress); $('walletHint').textContent = 'Wallet connected'; updateSignState(); }
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
connectButton.addEventListener('click', connectWallet); signButton.addEventListener('click', createProof);
statement.addEventListener('input', () => { $('counter').textContent = `${statement.value.length} / 240`; updateSignState(); });
$('closeDialog').addEventListener('click', () => $('proofDialog').close());
$('copyButton').addEventListener('click', async () => { if (!latestProof) return; await navigator.clipboard.writeText(JSON.stringify(latestProof, null, 2)); notify('Proof details copied.'); });
$('clearButton').addEventListener('click', () => { localStorage.removeItem('proofnest-proofs'); renderProofs(); notify('Local vault cleared.'); });
if (window.ethereum) window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => { if (accounts[0]) { walletAddress = accounts[0]; connectButton.textContent = shortAddress(walletAddress); $('walletHint').textContent = 'Wallet connected'; updateSignState(); } });
renderProofs();
