// PayJoin Demo Script

// Demo state management
const state = {
    currentStep: 'initial',
    senderStep: 'waiting',
    receiverStep: 'ready',
    bip21Uri: '',
    originalPsbt: '',
    payjoinPsbt: '',
    txid: '',
};

// DOM elements
const elements = {
    // Sender elements
    senderStatus: document.getElementById('sender-status'),
    scanBtn: document.getElementById('scan-btn'),
    createPsbtBtn: document.getElementById('create-psbt-btn'),
    sendPsbtBtn: document.getElementById('send-psbt-btn'),
    signPayjoinBtn: document.getElementById('sign-payjoin-btn'),
    broadcastBtn: document.getElementById('broadcast-btn'),
    
    // Receiver elements
    receiverStatus: document.getElementById('receiver-status'),
    generateBip21Btn: document.getElementById('generate-bip21-btn'),
    checkPsbtBtn: document.getElementById('check-psbt-btn'),
    createPayjoinBtn: document.getElementById('create-payjoin-btn'),
    respondBtn: document.getElementById('respond-btn'),
    
    // Shared elements
    payjoinDirectory: document.getElementById('payjoin-directory'),
    transactionVisualization: document.getElementById('transaction-visualization'),
};

// Mock data
const mockData = {
    bip21: 'bitcoin:bc1qxyz...?amount=0.01&pj=https://pj.example.com',
    originalPsbt: 'cHNidP8BAHECAAAAAUlmL+oX8QYJQZBDWRxYsw5L0SNUp4ro5xr7aBNag8RVAAAAAIABAAAAAAD/////AhAnAAAAAAAAFgAU8AKGF1zIVqK8D+M2q9HBQrP3ahsBBwAAAAAAABYAFMYz73pT2TLOYshV+qtmzSqYRRYqAAAAAAABAIkCAAAAAZ0NOgZ1iCsVv7D0yEF5FyR92u8gV5MCYdWbzVFnQY12AAAAAP3///8C2AkAAAAAAAAWABTKWFfqrKJBV3Gg7J4xhHN9LywzXoNrBgAAAAAAFgAUR7BZ9rXCEBLiZE073WAnUBtJbI0AAAAAAQA/AgAAAAH4PLOkoNcV3FuL0yA+zXUVdeQtkfZnA8mKR9CpKSHNzQAAAAAA/v///wLYCQAAAAAAABYAFK4wLnFAJVQQgwrM+1gcGTj1ZrroQrEHAAAAAAAWABR7JTprv5R3F+k7WMdEXKRbpYXrZgAAAAABAP0CAAAAAf5hRQKcfDaT4ZmEFNXTQEcf8hZ6G1NHBkmVLfKlyBKYAAAAAAD+////AhAnAAAAAAAAFgAUaBrR6xW1u5FOvZxP3M/Vw2qrUFLYCwAAAAAAABYAFHCmeRNQsECTPzcHwGRTP20J1zGTAAAAAAA=',
    payjoinPsbt: 'cHNidP8BAJoCAAAAAklmL+oX8QYJQZBDWRxYsw5L0SNUp4ro5xr7aBNag8RVAAAAAAD/////g7UNFO0CY8HVD+f3Q8dh5pMQFTN+n9I7Y8ykwsrKZxsAAAAAAP////8CECcAAAAAAAAWABTwAoYXXMhWorwP4zar0cFCs/dqGwEHAAAAAAAAFgAUxjPvelPZMs5iyFX6q2bNKphFFioAAAAAAAEAiQIAAAABnQ06BnWIKxW/sPTIQXkXJH3a7yBXkwJh1ZvNUWdBjXYAAAAA/f///wLYCQAAAAAAABYAFMpYV+qsokFXcaDsnjGEc30vLDNeg2sGAAAAAAAWABRHsFn2tcIQEuJkTTvdYCdQG0lsjQAAAAABAD8CAAAAAf... truncated ...',
    txid: '7e7962b3e3d02b6d5c4c79ce4142f979f41c838723121c68cb3acc325329e620',
};

// Initialize the UI
function init() {
    // Add event listeners to buttons
    elements.generateBip21Btn.addEventListener('click', handleGenerateBip21);
    elements.scanBtn.addEventListener('click', handleScanBip21);
    elements.createPsbtBtn.addEventListener('click', handleCreateOriginalPsbt);
    elements.sendPsbtBtn.addEventListener('click', handleSendOriginalPsbt);
    elements.checkPsbtBtn.addEventListener('click', handleCheckOriginalPsbt);
    elements.createPayjoinBtn.addEventListener('click', handleCreatePayjoinPsbt);
    elements.respondBtn.addEventListener('click', handleRespondWithPayjoinPsbt);
    elements.signPayjoinBtn.addEventListener('click', handleSignPayjoinPsbt);
    elements.broadcastBtn.addEventListener('click', handleBroadcastTx);
}

// Event handlers
function handleGenerateBip21() {
    // Update state
    state.bip21Uri = mockData.bip21;
    state.receiverStep = 'bip21_generated';
    
    // Update UI
    updateReceiverStatus('Generated BIP21 payment request with payjoin endpoint');
    elements.payjoinDirectory.innerHTML = `
        <div class="p-3 border-b border-gray-200">
            <p class="font-semibold text-gray-700 mb-2">BIP21 Payment Request:</p>
            <div class="bip21-uri">${state.bip21Uri}</div>
        </div>
    `;
    
    // Visualize the BIP21 with a mock QR code
    elements.transactionVisualization.innerHTML = `
        <div class="text-center">
            <div class="qr-container mx-auto">
                <div class="border-4 border-black h-24 w-24 mx-auto grid grid-cols-4 grid-rows-4 gap-1 p-1">
                    <!-- Simplified QR code representation -->
                    <div class="bg-black"></div>
                    <div class="bg-black"></div>
                    <div class="bg-black"></div>
                    <div class="bg-black"></div>
                    <div class="bg-black"></div>
                    <div class="bg-white"></div>
                    <div class="bg-white"></div>
                    <div class="bg-black"></div>
                    <div class="bg-black"></div>
                    <div class="bg-white"></div>
                    <div class="bg-white"></div>
                    <div class="bg-black"></div>
                    <div class="bg-black"></div>
                    <div class="bg-black"></div>
                    <div class="bg-black"></div>
                    <div class="bg-black"></div>
                </div>
            </div>
            <p class="mt-2 text-sm text-gray-600">BIP21 QR Code with PayJoin endpoint</p>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.generateBip21Btn.disabled = true;
    elements.scanBtn.disabled = false;
}

function handleScanBip21() {
    // Update state
    state.senderStep = 'bip21_scanned';
    
    // Update UI
    updateSenderStatus('BIP21 payment request scanned. Ready to create PSBT.');
    
    // Enable/disable appropriate buttons
    elements.scanBtn.disabled = true;
    elements.createPsbtBtn.disabled = false;
    
    // Add highlight animation to sender panel
    highlightElement(elements.senderStatus);
}

function handleCreateOriginalPsbt() {
    // Update state
    state.originalPsbt = mockData.originalPsbt;
    state.senderStep = 'psbt_created';
    
    // Update UI
    updateSenderStatus('Original PSBT created. Ready to send to payjoin endpoint.');
    
    // Show the PSBT in the visualization
    elements.transactionVisualization.innerHTML = `
        <div class="w-full">
            <h4 class="text-center font-semibold mb-2">Original Transaction</h4>
            <div class="flex flex-col gap-2">
                <div class="tx-input">Input: 0.015 BTC (from sender)</div>
                <div class="arrow-icon text-center">↓</div>
                <div class="tx-output">Output 1: 0.01 BTC (to receiver)</div>
                <div class="tx-output">Output 2: 0.00499 BTC (change back to sender)</div>
            </div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.createPsbtBtn.disabled = true;
    elements.sendPsbtBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.transactionVisualization);
}

function handleSendOriginalPsbt() {
    // Update state
    state.senderStep = 'psbt_sent';
    
    // Update UI
    updateSenderStatus('Original PSBT sent to payjoin endpoint. Waiting for payjoin proposal...');
    
    // Update the payjoin directory
    elements.payjoinDirectory.innerHTML = `
        <div class="p-3 border-b border-gray-200">
            <p class="font-semibold text-gray-700 mb-2">Original PSBT from Sender:</p>
            <div class="psbt-data">${truncatePsbt(state.originalPsbt)}</div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.sendPsbtBtn.disabled = true;
    elements.checkPsbtBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.payjoinDirectory);
}

function handleCheckOriginalPsbt() {
    // Update state
    state.receiverStep = 'psbt_received';
    
    // Update UI
    updateReceiverStatus('Original PSBT received. Ready to create payjoin proposal.');
    
    // Enable/disable appropriate buttons
    elements.checkPsbtBtn.disabled = true;
    elements.createPayjoinBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.receiverStatus);
}

function handleCreatePayjoinPsbt() {
    // Update state
    state.payjoinPsbt = mockData.payjoinPsbt;
    state.receiverStep = 'payjoin_created';
    
    // Update UI
    updateReceiverStatus('Payjoin PSBT created. Ready to respond to sender.');
    
    // Show the Payjoin PSBT in the visualization
    elements.transactionVisualization.innerHTML = `
        <div class="w-full">
            <h4 class="text-center font-semibold mb-2">Payjoin Transaction</h4>
            <div class="flex flex-col gap-2">
                <div class="tx-input">Input 1: 0.015 BTC (from sender)</div>
                <div class="tx-input">Input 2: 0.005 BTC (from receiver)</div>
                <div class="arrow-icon text-center">↓</div>
                <div class="tx-output">Output 1: 0.01499 BTC (to receiver)</div>
                <div class="tx-output">Output 2: 0.00999 BTC (to sender)</div>
            </div>
            <p class="text-center text-sm text-gray-600 mt-2">Receiver added their own input, breaking the common-input-ownership heuristic</p>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.createPayjoinBtn.disabled = true;
    elements.respondBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.transactionVisualization);
}

function handleRespondWithPayjoinPsbt() {
    // Update state
    state.receiverStep = 'payjoin_sent';
    
    // Update UI
    updateReceiverStatus('Payjoin PSBT sent to sender. Waiting for signature and broadcast...');
    
    // Update the payjoin directory
    elements.payjoinDirectory.innerHTML = `
        <div class="p-3 border-b border-gray-200">
            <p class="font-semibold text-gray-700 mb-2">Original PSBT from Sender:</p>
            <div class="psbt-data">${truncatePsbt(state.originalPsbt)}</div>
        </div>
        <div class="p-3">
            <p class="font-semibold text-gray-700 mb-2">Payjoin PSBT from Receiver:</p>
            <div class="psbt-data">${truncatePsbt(state.payjoinPsbt)}</div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.respondBtn.disabled = true;
    elements.signPayjoinBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.payjoinDirectory);
}

function handleSignPayjoinPsbt() {
    // Update state
    state.senderStep = 'payjoin_signed';
    
    // Update UI
    updateSenderStatus('Payjoin PSBT signed. Ready to broadcast the transaction.');
    
    // Enable/disable appropriate buttons
    elements.signPayjoinBtn.disabled = true;
    elements.broadcastBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.senderStatus);
}

function handleBroadcastTx() {
    // Update state
    state.txid = mockData.txid;
    state.senderStep = 'tx_broadcast';
    state.receiverStep = 'tx_broadcast';
    
    // Update UI
    updateSenderStatus('Transaction successfully broadcast! TXID: ' + state.txid.substring(0, 10) + '...');
    updateReceiverStatus('Payjoin transaction broadcast! TXID: ' + state.txid.substring(0, 10) + '...');
    
    // Show the mempool visualization
    elements.transactionVisualization.innerHTML = `
        <div class="w-full">
            <h4 class="text-center font-semibold mb-2">Transaction in Mempool</h4>
            <div class="mempool-block">
                <div class="mempool-tx highlight">
                    <div class="flex justify-between items-center">
                        <span class="status-indicator success"></span>
                        <span class="font-semibold">TXID: ${state.txid.substring(0, 10)}...</span>
                        <span class="text-xs text-gray-500">Fee: 123 sat/vB</span>
                    </div>
                    <div class="mt-1 text-xs">Inputs: 2 | Outputs: 2 | Size: 341 vB</div>
                </div>
                <div class="mempool-tx opacity-70">
                    <div class="flex justify-between items-center">
                        <span class="status-indicator pending"></span>
                        <span class="font-semibold">TXID: 8f3a1c...</span>
                        <span class="text-xs text-gray-500">Fee: 98 sat/vB</span>
                    </div>
                </div>
                <div class="mempool-tx opacity-50">
                    <div class="flex justify-between items-center">
                        <span class="status-indicator pending"></span>
                        <span class="font-semibold">TXID: 2c91ab...</span>
                        <span class="text-xs text-gray-500">Fee: 84 sat/vB</span>
                    </div>
                </div>
                <p class="text-center text-xs text-gray-600 mt-3">To blockchain observers, this looks like a regular transaction</p>
            </div>
        </div>
    `;
    
    // Disable broadcast button
    elements.broadcastBtn.disabled = true;
    
    // Add highlight animation
    highlightElement(elements.transactionVisualization);
}

// Helper functions
function updateSenderStatus(message) {
    elements.senderStatus.innerHTML = `<p class="text-gray-600">${message}</p>`;
}

function updateReceiverStatus(message) {
    elements.receiverStatus.innerHTML = `<p class="text-gray-600">${message}</p>`;
}

function truncatePsbt(psbt) {
    if (psbt.length > 100) {
        return psbt.substring(0, 50) + '... truncated ...' + psbt.substring(psbt.length - 50);
    }
    return psbt;
}

function highlightElement(element) {
    element.classList.add('highlight');
    setTimeout(() => {
        element.classList.remove('highlight');
    }, 1500);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
