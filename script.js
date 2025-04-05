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
    activeStepNumber: 1
};

// DOM elements
const elements = {
    // Process flow elements
    stepIndicators: {
        step1: document.getElementById('step-1'),
        step2: document.getElementById('step-2'),
        step3: document.getElementById('step-3'),
        step4: document.getElementById('step-4'),
        step5: document.getElementById('step-5')
    },
    
    // Sender elements
    senderStatus: document.getElementById('sender-status'),
    senderUI: document.getElementById('sender-ui'),
    scanBtn: document.getElementById('scan-btn'),
    createPsbtBtn: document.getElementById('create-psbt-btn'),
    sendPsbtBtn: document.getElementById('send-psbt-btn'),
    signPayjoinBtn: document.getElementById('sign-payjoin-btn'),
    broadcastBtn: document.getElementById('broadcast-btn'),
    
    // Receiver elements
    receiverStatus: document.getElementById('receiver-status'),
    receiverUI: document.getElementById('receiver-ui'),
    generateBip21Btn: document.getElementById('generate-bip21-btn'),
    checkPsbtBtn: document.getElementById('check-psbt-btn'),
    createPayjoinBtn: document.getElementById('create-payjoin-btn'),
    respondBtn: document.getElementById('respond-btn'),
    
    // Visualization elements
    dataFlowVisualization: document.getElementById('data-flow-visualization'),
    payjoinDirectory: document.getElementById('payjoin-directory'),
    transactionVisualization: document.getElementById('transaction-visualization'),
    
    // Code containers
    codeContainers: {
        bip21Container: document.getElementById('bip21-container'),
        bip21Code: document.getElementById('bip21-code'),
        originalPsbtContainer: document.getElementById('original-psbt-container'),
        originalPsbtCode: document.getElementById('original-psbt-code'),
        payjoinPsbtContainer: document.getElementById('payjoin-psbt-container'),
        payjoinPsbtCode: document.getElementById('payjoin-psbt-code'),
        txidContainer: document.getElementById('txid-container'),
        txidCode: document.getElementById('txid-code')
    }
};

// Mock data
const mockData = {
    bip21: 'bitcoin:bc1qxyz123abc456def789ghi0jklmn0pqrstuvwxyz?amount=0.01&pj=https://pj.example.com/endpoints/1a2b3c4d5e6f',
    originalPsbt: 'cHNidP8BAHECAAAAAUlmL+oX8QYJQZBDWRxYsw5L0SNUp4ro5xr7aBNag8RVAAAAAIABAAAAAAD/////AhAnAAAAAAAAFgAU8AKGF1zIVqK8D+M2q9HBQrP3ahsBBwAAAAAAABYAFMYz73pT2TLOYshV+qtmzSqYRRYqAAAAAAABAIkCAAAAAZ0NOgZ1iCsVv7D0yEF5FyR92u8gV5MCYdWbzVFnQY12AAAAAP3///8C2AkAAAAAAAAWABTKWFfqrKJBV3Gg7J4xhHN9LywzXoNrBgAAAAAAFgAUR7BZ9rXCEBLiZE073WAnUBtJbI0AAAAAAQA/AgAAAAH4PLOkoNcV3FuL0yA+zXUVdeQtkfZnA8mKR9CpKSHNzQAAAAAA/v///wLYCQAAAAAAABYAFK4wLnFAJVQQgwrM+1gcGTj1ZrroQrEHAAAAAAAWABR7JTprv5R3F+k7WMdEXKRbpYXrZgAAAAABAP0CAAAAAf5hRQKcfDaT4ZmEFNXTQEcf8hZ6G1NHBkmVLfKlyBKYAAAAAAD+////AhAnAAAAAAAAFgAUaBrR6xW1u5FOvZxP3M/Vw2qrUFLYCwAAAAAAABYAFHCmeRNQsECTPzcHwGRTP20J1zGTAAAAAAA=',
    payjoinPsbt: 'cHNidP8BAJoCAAAAAklmL+oX8QYJQZBDWRxYsw5L0SNUp4ro5xr7aBNag8RVAAAAAAD/////g7UNFO0CY8HVD+f3Q8dh5pMQFTN+n9I7Y8ykwsrKZxsAAAAAAP////8CECcAAAAAAAAWABTwAoYXXMhWorwP4zar0cFCs/dqGwEHAAAAAAAAFgAUxjPvelPZMs5iyFX6q2bNKphFFioAAAAAAAEAiQIAAAABnQ06BnWIKxW/sPTIQXkXJH3a7yBXkwJh1ZvNUWdBjXYAAAAA/f///wLYCQAAAAAAABYAFMpYV+qsokFXcaDsnjGEc30vLDNeg2sGAAAAAAAWABRHsFn2tcIQEuJkTTvdYCdQG0lsjQAAAAABAD8CAAAAAf... truncated for demo purposes ...',
    txid: '7e7962b3e3d02b6d5c4c79ce4142f979f41c838723121c68cb3acc325329e620',
    receiverAddress: 'bc1qxyz123abc456def789ghi0jklmn0pqrstuvwxyz',
    amount: '0.01 BTC',
    payjoinEndpoint: 'https://pj.example.com/endpoints/1a2b3c4d5e6f'
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
    
    // Initialize clipboard.js for copy buttons
    const clipboard = new ClipboardJS('.copy-btn', {
        text: function(trigger) {
            const targetId = trigger.getAttribute('data-target');
            return document.getElementById(targetId).textContent;
        }
    });
    
    clipboard.on('success', function(e) {
        const originalText = e.trigger.innerHTML;
        e.trigger.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(function() {
            e.trigger.innerHTML = originalText;
        }, 2000);
        e.clearSelection();
    });
}

// Helper for updating step indicator
function updateStepIndicator(stepNumber) {
    state.activeStepNumber = stepNumber;
    
    // Reset all steps to inactive
    Object.values(elements.stepIndicators).forEach(indicator => {
        const circleEl = indicator.querySelector('div');
        circleEl.classList.remove('bg-blue-600', 'text-white');
        circleEl.classList.add('bg-gray-300', 'text-gray-700');
    });
    
    // Set the active step
    const activeIndicator = elements.stepIndicators[`step${stepNumber}`];
    const activeCircleEl = activeIndicator.querySelector('div');
    activeCircleEl.classList.remove('bg-gray-300', 'text-gray-700');
    activeCircleEl.classList.add('bg-blue-600', 'text-white');
    
    // Add 'completed' styling to previous steps
    for (let i = 1; i < stepNumber; i++) {
        const prevIndicator = elements.stepIndicators[`step${i}`];
        const prevCircleEl = prevIndicator.querySelector('div');
        prevCircleEl.classList.remove('bg-gray-300', 'text-gray-700');
        prevCircleEl.classList.add('bg-green-500', 'text-white');
    }
}

// Event handlers
function handleGenerateBip21() {
    // Update state
    state.bip21Uri = mockData.bip21;
    state.receiverStep = 'bip21_generated';
    updateStepIndicator(1);
    
    // Update UI
    updateReceiverStatus('Generated BIP21 payment request with payjoin endpoint');
    
    // Show the BIP21 URI in the code container for easy copying
    elements.codeContainers.bip21Code.textContent = state.bip21Uri;
    elements.codeContainers.bip21Container.classList.remove('hidden');
    
    // Update receiver UI with payment request details
    elements.receiverUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Receiver's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                    Payment Request Generated
                </span>
            </div>
            <div class="qr-container mx-auto mb-2">
                <div class="border-4 border-black h-32 w-32 mx-auto grid grid-cols-5 grid-rows-5 gap-1 p-1">
                    <!-- Simplified QR code representation -->
                    <div class="bg-black"></div><div class="bg-black"></div><div class="bg-black"></div><div class="bg-black"></div><div class="bg-black"></div>
                    <div class="bg-black"></div><div class="bg-white"></div><div class="bg-white"></div><div class="bg-white"></div><div class="bg-black"></div>
                    <div class="bg-black"></div><div class="bg-white"></div><div class="bg-black"></div><div class="bg-white"></div><div class="bg-black"></div>
                    <div class="bg-black"></div><div class="bg-white"></div><div class="bg-white"></div><div class="bg-white"></div><div class="bg-black"></div>
                    <div class="bg-black"></div><div class="bg-black"></div><div class="bg-black"></div><div class="bg-black"></div><div class="bg-black"></div>
                </div>
            </div>
            <div class="text-center text-sm">
                <p class="mb-1 font-semibold">Request details:</p>
                <p class="text-gray-600">Amount: <span class="font-mono">${mockData.amount}</span></p>
                <p class="text-gray-600">Address: <span class="font-mono text-xs">${mockData.receiverAddress.substring(0, 10)}...</span></p>
                <p class="text-gray-600">PayJoin: <span class="text-green-600">Enabled</span></p>
            </div>
        </div>
    `;
    
    // Update data flow visualization
    elements.dataFlowVisualization.innerHTML = `
        <div class="w-full">
            <div class="flex justify-between items-center">
                <div class="text-purple-500">
                    <i class="fas fa-store text-xl"></i>
                </div>
                <div class="flex-grow mx-4 relative">
                    <div class="h-0.5 bg-gray-300 w-full absolute top-1/2"></div>
                    <div class="absolute top-1/2 left-0 transform -translate-y-1/2 fade-in" style="animation-delay:0.5s">
                        <i class="fas fa-chevron-right text-purple-500"></i>
                    </div>
                </div>
                <div class="text-blue-500">
                    <i class="fas fa-mobile-alt text-xl opacity-50"></i>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">(1) BIP21 URI with PayJoin endpoint</div>
            </div>
        </div>
    `;
    
    // Update the payjoin directory
    elements.payjoinDirectory.innerHTML = `
        <div class="p-3">
            <p class="font-semibold text-gray-700 mb-2">BIP21 Payment Request:</p>
            <div class="bg-gray-100 p-2 rounded font-mono text-xs overflow-x-auto">
                ${state.bip21Uri.replace('bitcoin:', '<span class="text-green-600">bitcoin:</span>').replace('amount=0.01', '<span class="text-blue-600">amount=0.01</span>').replace('pj=https://', '<span class="text-purple-600">pj=https://</span>')}
            </div>
        </div>
    `;
    
    // Visualize the transaction state
    elements.transactionVisualization.innerHTML = `
        <div class="w-full" style="min-height: 120px">
            <p class="text-center text-gray-500 mb-4">No transaction created yet</p>
            <div class="flex justify-center">
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center w-40">
                    <p class="text-sm font-medium text-purple-700">Receiver</p>
                    <p class="text-xs text-gray-600 mt-1">Waiting for sender...</p>
                </div>
            </div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.generateBip21Btn.disabled = true;
    elements.scanBtn.disabled = false;
}

function handleScanBip21() {
    // Update state
    state.senderStep = 'bip21_scanned';
    updateStepIndicator(2);


    // Update UI
    updateSenderStatus('BIP21 payment request scanned. Ready to create PSBT.');
    
    // Update the sender UI with scanned details
    elements.senderUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Sender's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                    Payment Request Scanned
                </span>
            </div>
            <div class="bg-white rounded p-3 mb-3 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-semibold text-gray-700">Payment Details</span>
                    <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">PayJoin Enabled</span>
                </div>
                <div class="space-y-1">
                    <p class="text-sm">To: <span class="font-mono text-xs text-gray-600">${mockData.receiverAddress.substring(0, 10)}...</span></p>
                    <p class="text-sm">Amount: <span class="font-semibold">${mockData.amount}</span></p>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-xs text-gray-600">Network Fee: ~0.00001 BTC</span>
                        <span class="text-xs text-gray-600">Total: 0.01001 BTC</span>
                    </div>
                </div>
            </div>
            <div class="text-center text-xs text-gray-600">
                <p>Tap "Create PSBT" to proceed</p>
            </div>
        </div>
    `;
    
    // Update data flow visualization
    elements.dataFlowVisualization.innerHTML = `
        <div class="w-full">
            <div class="flex justify-between items-center">
                <div class="text-purple-500">
                    <i class="fas fa-store text-xl"></i>
                </div>
                <div class="flex-grow mx-4 relative">
                    <div class="h-0.5 bg-gray-300 w-full absolute top-1/2"></div>
                    <div class="absolute top-1/2 right-0 transform -translate-y-1/2 fade-in" style="animation-delay:0.5s">
                        <i class="fas fa-check-circle text-green-500"></i>
                    </div>
                </div>
                <div class="text-blue-500">
                    <i class="fas fa-mobile-alt text-xl"></i>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">(2) Payment request scanned</div>
            </div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.scanBtn.disabled = true;
    elements.createPsbtBtn.disabled = false;
    
    // Add highlight animation to sender panel
    highlightElement(elements.senderUI);
    highlightElement(elements.dataFlowVisualization);
}

function handleCreateOriginalPsbt() {
    // Update state
    state.originalPsbt = mockData.originalPsbt;
    state.senderStep = 'psbt_created';
    updateStepIndicator(3);

    // Update UI
    updateSenderStatus('Original PSBT created. Ready to send to payjoin endpoint.');
    
    // Show the PSBT in the code container for easy copying
    elements.codeContainers.originalPsbtCode.textContent = state.originalPsbt;
    elements.codeContainers.originalPsbtContainer.classList.remove('hidden');
    
    // Update sender UI with PSBT creation
    elements.senderUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Sender's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                    PSBT Created
                </span>
            </div>
            <div class="bg-white rounded p-3 shadow-sm space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-semibold text-gray-700">Transaction Created</span>
                    <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Unsigned</span>
                </div>
                <div class="border border-gray-200 rounded p-2 bg-gray-50">
                    <div class="text-xs font-medium mb-1">Inputs:</div>
                    <div class="text-xs font-mono bg-blue-50 p-1 rounded mb-2">0.015 BTC (from sender wallet)</div>
                    <div class="text-xs font-medium mb-1">Outputs:</div>
                    <div class="text-xs font-mono bg-green-50 p-1 rounded mb-1">0.01 BTC (to receiver)</div>
                    <div class="text-xs font-mono bg-green-50 p-1 rounded">0.00499 BTC (change back to sender)</div>
                </div>
            </div>
            <div class="text-center text-xs text-gray-600 mt-2">
                <p>Tap "Send PSBT" to share with receiver</p>
            </div>
        </div>
    `;
    
    // Show the standard transaction in the visualization
    elements.transactionVisualization.innerHTML = `
        <div class="w-full">
            <h4 class="text-center font-semibold mb-2">Original Transaction</h4>
            <div class="flex flex-col gap-2 max-w-lg mx-auto">
                <div class="tx-input p-2">
                    <div class="flex justify-between">
                        <span class="font-semibold">Input:</span>
                        <span>0.015 BTC</span>
                    </div>
                    <div class="text-xs text-gray-600">From sender's wallet</div>
                </div>
                <div class="arrow-icon text-center">
                    <i class="fas fa-long-arrow-alt-down"></i>
                </div>
                <div class="tx-output p-2">
                    <div class="flex justify-between">
                        <span class="font-semibold">Output 1:</span>
                        <span>0.01 BTC</span>
                    </div>
                    <div class="text-xs text-gray-600">To receiver's address</div>
                </div>
                <div class="tx-output p-2">
                    <div class="flex justify-between">
                        <span class="font-semibold">Output 2:</span>
                        <span>0.00499 BTC</span>
                    </div>
                    <div class="text-xs text-gray-600">Change back to sender's wallet</div>
                </div>
                <div class="text-xs text-center text-gray-500 mt-2">
                    Network fee: 0.00001 BTC
                </div>
            </div>
            <div class="mt-3 text-sm text-center text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                This is a standard Bitcoin transaction that surveillance can easily analyze
            </div>
        </div>
    `;
    
    // Update data flow visualization
    elements.dataFlowVisualization.innerHTML = `
        <div class="w-full">
            <div class="flex justify-between items-center">
                <div class="text-purple-500 opacity-50">
                    <i class="fas fa-store text-xl"></i>
                </div>
                <div class="flex-grow mx-4 relative">
                    <div class="h-0.5 bg-gray-300 w-full absolute top-1/2"></div>
                </div>
                <div class="text-blue-500">
                    <i class="fas fa-mobile-alt text-xl"></i>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">(3) Original PSBT created by sender</div>
            </div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.createPsbtBtn.disabled = true;
    elements.sendPsbtBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.transactionVisualization);
    highlightElement(elements.senderUI);
}

function handleSendOriginalPsbt() {
    // Update state
    state.senderStep = 'psbt_sent';
    updateStepIndicator(4);
    
    // Update UI
    updateSenderStatus('Original PSBT sent to payjoin endpoint. Waiting for payjoin proposal...');
    
    // Update sender UI with sending status
    elements.senderUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Sender's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                    PSBT Sent
                </span>
            </div>
            <div class="bg-white rounded p-3 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-semibold text-gray-700">Submission Status</span>
                    <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Pending Response</span>
                </div>
                <div class="text-center mt-4 mb-4">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p class="text-sm text-gray-600 mt-2">Waiting for receiver to create PayJoin...</p>
                </div>
            </div>
        </div>
    `;
    
    // Update data flow visualization to show the PSBT being sent
    elements.dataFlowVisualization.innerHTML = `
        <div class="w-full">
            <div class="flex justify-between items-center">
                <div class="text-purple-500 opacity-50">
                    <i class="fas fa-store text-xl"></i>
                </div>
                <div class="flex-grow mx-4 relative">
                    <div class="h-0.5 bg-gray-300 w-full absolute top-1/2"></div>
                    <div class="absolute top-1/2 left-0 w-1/2 h-0.5 bg-blue-500"></div>
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 fade-in" style="animation-delay:0.3s">
                        <i class="fas fa-file-signature text-blue-500"></i>
                    </div>
                </div>
                <div class="text-blue-500">
                    <i class="fas fa-mobile-alt text-xl"></i>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">(4) Original PSBT sent to receiver</div>
            </div>
        </div>
    `;
    
    // Update the payjoin directory
    elements.payjoinDirectory.innerHTML = `
        <div class="p-3">
            <div class="flex justify-between items-center mb-2">
                <p class="font-semibold text-gray-700">Original PSBT from Sender</p>
                <span class="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">Just Added</span>
            </div>
            <div class="bg-blue-50 border border-blue-100 p-2 rounded font-mono text-xs overflow-x-auto highlight">
                ${truncatePsbt(state.originalPsbt)}
            </div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.sendPsbtBtn.disabled = true;
    elements.checkPsbtBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.payjoinDirectory);
    highlightElement(elements.dataFlowVisualization);
}

function handleCheckOriginalPsbt() {
    // Update state
    state.receiverStep = 'psbt_received';
    
    // Update UI
    updateReceiverStatus('Original PSBT received. Ready to create payjoin proposal.');
    
    // Update receiver UI with PSBT received
    elements.receiverUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Receiver's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                    PSBT Received
                </span>
            </div>
            <div class="bg-white rounded p-3 shadow-sm space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-semibold text-gray-700">Incoming Transaction</span>
                    <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">PayJoin Opportunity</span>
                </div>
                <div class="border border-gray-200 rounded p-2 bg-gray-50">
                    <div class="text-xs font-medium mb-1">Standard Transaction:</div>
                    <div class="text-xs font-mono mb-2">Receiving: <span class="text-green-600 font-semibold">${mockData.amount}</span></div>
                    <div class="text-xs font-medium text-purple-700">PayJoin Action:</div>
                    <div class="text-xs text-gray-600">Add your own input to enhance privacy</div>
                </div>
            </div>
            <div class="text-center text-xs text-gray-600 mt-2">
                <p>Tap "Create PayJoin" to improve transaction privacy</p>
            </div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.checkPsbtBtn.disabled = true;
    elements.createPayjoinBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.receiverUI);
}

function handleCreatePayjoinPsbt() {
    // Update state
    state.payjoinPsbt = mockData.payjoinPsbt;
    state.receiverStep = 'payjoin_created';
    
    // Update UI
    updateReceiverStatus('Payjoin PSBT created. Ready to respond to sender.');
    
    // Show the Payjoin PSBT in the code container for easy copying
    elements.codeContainers.payjoinPsbtCode.textContent = state.payjoinPsbt;
    elements.codeContainers.payjoinPsbtContainer.classList.remove('hidden');
    
    // Update receiver UI
    elements.receiverUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Receiver's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                    PayJoin Created
                </span>
            </div>
            <div class="bg-white rounded p-3 shadow-sm space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-semibold text-gray-700">Payjoin PSBT Created</span>
                    <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Privacy Enhanced</span>
                </div>
                <div class="border border-gray-200 rounded p-2 bg-gray-50">
                    <div class="text-xs font-medium mb-1">Added Input:</div>
                    <div class="text-xs font-mono bg-purple-50 p-1 rounded mb-2">0.005 BTC (from receiver wallet)</div>
                    <div class="text-xs font-medium mb-1">Adjusted Outputs:</div>
                    <div class="text-xs font-mono bg-green-50 p-1 rounded mb-1">0.01499 BTC (to receiver)</div>
                    <div class="text-xs font-mono bg-green-50 p-1 rounded">0.00999 BTC (to sender)</div>
                </div>
            </div>
            <div class="text-center text-xs text-gray-600 mt-2">
                <p>Tap "Respond" to send PayJoin PSBT to sender</p>
            </div>
        </div>
    `;
    
    // Show the Payjoin PSBT in the visualization with comparison to original
    elements.transactionVisualization.innerHTML = `
        <div class="w-full">
            <h4 class="text-center font-semibold mb-2">PayJoin vs Standard Transaction</h4>
            <div class="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                <div>
                    <h5 class="text-center text-sm text-gray-500 mb-1">Standard Transaction</h5>
                    <div class="border border-gray-200 rounded p-2">
                        <div class="tx-input p-2 opacity-80">
                            <div class="flex justify-between">
                                <span class="font-semibold text-xs">Input:</span>
                                <span class="text-xs">0.015 BTC</span>
                            </div>
                            <div class="text-xs text-gray-600">From sender</div>
                        </div>
                        <div class="arrow-icon text-center my-1">
                            <i class="fas fa-long-arrow-alt-down text-xs"></i>
                        </div>
                        <div class="tx-output p-2 opacity-80">
                            <div class="flex justify-between">
                                <span class="font-semibold text-xs">Output 1:</span>
                                <span class="text-xs">0.01 BTC</span>
                            </div>
                            <div class="text-xs text-gray-600">To receiver</div>
                        </div>
                        <div class="tx-output p-2 opacity-80">
                            <div class="flex justify-between">
                                <span class="font-semibold text-xs">Output 2:</span>
                                <span class="text-xs">0.00499 BTC</span>
                            </div>
                            <div class="text-xs text-gray-600">Change to sender</div>
                        </div>
                    </div>
                </div>
                <div>
                    <h5 class="text-center text-sm font-semibold text-purple-700 mb-1">PayJoin Transaction</h5>
                    <div class="border-2 border-purple-200 rounded p-2 highlight">
                        <div class="tx-input p-2">
                            <div class="flex justify-between">
                                <span class="font-semibold text-xs">Input 1:</span>
                                <span class="text-xs">0.015 BTC</span>
                            </div>
                            <div class="text-xs text-gray-600">From sender</div>
                        </div>
                        <div class="tx-input p-2 bg-purple-50 border border-purple-100">
                            <div class="flex justify-between">
                                <span class="font-semibold text-xs">Input 2:</span>
                                <span class="text-xs">0.005 BTC</span>
                            </div>
                            <div class="text-xs text-purple-600">From receiver (new!)</div>
                        </div>
                        <div class="arrow-icon text-center my-1">
                            <i class="fas fa-long-arrow-alt-down"></i>
                        </div>
                        <div class="tx-output p-2 bg-green-50 border border-green-100">
                            <div class="flex justify-between">
                                <span class="font-semibold text-xs">Output 1:</span>
                                <span class="text-xs">0.01499 BTC</span>
                            </div>
                            <div class="text-xs text-green-600">To receiver (increased!)</div>
                        </div>
                        <div class="tx-output p-2 bg-green-50 border border-green-100">
                            <div class="flex justify-between">
                                <span class="font-semibold text-xs">Output 2:</span>
                                <span class="text-xs">0.00999 BTC</span>
                            </div>
                            <div class="text-xs text-green-600">To sender (increased!)</div>
                        </div>
                    </div>
                </div>
            </div>
            <p class="text-center text-sm text-gray-600 mt-3">
                <i class="fas fa-shield-alt text-purple-500 mr-1"></i>
                Receiver added their own input, breaking the "common-input-ownership" heuristic used in blockchain surveillance
            </p>
        </div>
    `;
    
    // Update data flow visualization
    elements.dataFlowVisualization.innerHTML = `
        <div class="w-full">
            <div class="flex justify-between items-center">
                <div class="text-purple-500">
                    <i class="fas fa-store text-xl"></i>
                </div>
                <div class="flex-grow mx-4 relative">
                    <div class="h-0.5 bg-gray-300 w-full absolute top-1/2"></div>
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 fade-in" style="animation-delay:0.3s">
                        <i class="fas fa-magic text-purple-500"></i>
                    </div>
                </div>
                <div class="text-blue-500 opacity-50">
                    <i class="fas fa-mobile-alt text-xl"></i>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">(4) Receiver created PayJoin PSBT</div>
            </div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.createPayjoinBtn.disabled = true;
    elements.respondBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.transactionVisualization);
    highlightElement(elements.receiverUI);
}

function handleRespondWithPayjoinPsbt() {
    // Update state
    state.receiverStep = 'payjoin_sent';
    updateStepIndicator(5);
    
    // Update UI
    updateReceiverStatus('Payjoin PSBT sent to sender. Waiting for signature and broadcast...');
    
    // Update receiver UI with sent status
    elements.receiverUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Receiver's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                    PayJoin PSBT Sent
                </span>
            </div>
            <div class="bg-white rounded p-3 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-semibold text-gray-700">Response Status</span>
                    <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Waiting for Signature</span>
                </div>
                <div class="text-center mt-2 mb-2">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    <p class="text-sm text-gray-600 mt-2">Waiting for sender to sign and broadcast...</p>
                </div>
            </div>
        </div>
    `;
    
    // Update the payjoin directory
    elements.payjoinDirectory.innerHTML = `
        <div class="p-3 border-b border-gray-200">
            <div class="flex justify-between items-center mb-2">
                <p class="font-semibold text-gray-700">Original PSBT from Sender</p>
                <span class="text-xs text-gray-500">Received</span>
            </div>
            <div class="bg-gray-100 p-2 rounded font-mono text-xs overflow-x-auto">
                ${truncatePsbt(state.originalPsbt)}
            </div>
        </div>
        <div class="p-3">
            <div class="flex justify-between items-center mb-2">
                <p class="font-semibold text-gray-700">Payjoin PSBT from Receiver</p>
                <span class="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">Just Added</span>
            </div>
            <div class="bg-purple-50 border border-purple-100 p-2 rounded font-mono text-xs overflow-x-auto highlight">
                ${truncatePsbt(state.payjoinPsbt)}
            </div>
        </div>
    `;
    
    // Update data flow visualization
    elements.dataFlowVisualization.innerHTML = `
        <div class="w-full">
            <div class="flex justify-between items-center">
                <div class="text-purple-500">
                    <i class="fas fa-store text-xl"></i>
                </div>
                <div class="flex-grow mx-4 relative">
                    <div class="h-0.5 bg-gray-300 w-full absolute top-1/2"></div>
                    <div class="absolute top-1/2 right-0 w-1/2 h-0.5 bg-purple-500"></div>
                    <div class="absolute top-1/2 right-1/2 transform translate-x-1/2 -translate-y-1/2 fade-in" style="animation-delay:0.3s">
                        <i class="fas fa-file-signature text-purple-500"></i>
                    </div>
                </div>
                <div class="text-blue-500">
                    <i class="fas fa-mobile-alt text-xl"></i>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">(5) PayJoin PSBT sent to sender</div>
            </div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.respondBtn.disabled = true;
    elements.signPayjoinBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.payjoinDirectory);
    highlightElement(elements.dataFlowVisualization);
}

function handleSignPayjoinPsbt() {
    // Update state
    state.senderStep = 'payjoin_signed';
    
    // Update UI
    updateSenderStatus('Payjoin PSBT signed. Ready to broadcast the transaction.');
    
    // Update sender UI with signed status
    elements.senderUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Sender's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                    PayJoin PSBT Signed
                </span>
            </div>
            <div class="bg-white rounded p-3 shadow-sm space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-semibold text-gray-700">Transaction Status</span>
                    <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Ready to Broadcast</span>
                </div>
                <div class="border border-gray-200 rounded p-2 bg-gray-50">
                    <div class="text-xs flex justify-between items-center mb-1">
                        <span class="font-medium">Total Inputs:</span>
                        <span>0.02 BTC</span>
                    </div>
                    <div class="text-xs flex justify-between items-center mb-1">
                        <span class="font-medium">Total Outputs:</span>
                        <span>0.01998 BTC</span>
                    </div>
                    <div class="text-xs flex justify-between items-center">
                        <span class="font-medium">Network Fee:</span>
                        <span>0.00002 BTC</span>
                    </div>
                </div>
            </div>
            <div class="text-center text-xs text-gray-600 mt-2">
                <p>Tap "Broadcast" to finalize the transaction</p>
            </div>
        </div>
    `;
    
    // Update data flow visualization
    elements.dataFlowVisualization.innerHTML = `
        <div class="w-full">
            <div class="flex justify-between items-center">
                <div class="text-purple-500 opacity-50">
                    <i class="fas fa-store text-xl"></i>
                </div>
                <div class="flex-grow mx-4 relative">
                    <div class="h-0.5 bg-gray-300 w-full absolute top-1/2"></div>
                </div>
                <div class="text-blue-500">
                    <i class="fas fa-mobile-alt text-xl"></i>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">(5) PayJoin PSBT signed by sender</div>
            </div>
        </div>
    `;
    
    // Enable/disable appropriate buttons
    elements.signPayjoinBtn.disabled = true;
    elements.broadcastBtn.disabled = false;
    
    // Add highlight animation
    highlightElement(elements.senderUI);
}

function handleBroadcastTx() {
    // Update state
    state.txid = mockData.txid;
    state.senderStep = 'tx_broadcast';
    state.receiverStep = 'tx_broadcast';
    updateStepIndicator(6);
    
    // Update UI
    updateSenderStatus('Transaction successfully broadcast! TXID: ' + state.txid.substring(0, 10) + '...');
    updateReceiverStatus('Payjoin transaction broadcast! TXID: ' + state.txid.substring(0, 10) + '...');
    
    // Show the TXID in the code container for easy copying
    elements.codeContainers.txidCode.textContent = state.txid;
    elements.codeContainers.txidContainer.classList.remove('hidden');
    
    // Update sender UI with success
    elements.senderUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Sender's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                    Transaction Broadcast
                </span>
            </div>
            <div class="bg-white rounded p-3 shadow-sm">
                <div class="text-center py-2">
                    <i class="fas fa-check-circle text-green-500 text-3xl"></i>
                    <p class="text-sm font-medium text-green-700 mt-2">PayJoin Transaction Sent!</p>
                </div>
                <div class="mt-2 text-xs text-gray-600">
                    <p class="mb-1">TXID: <span class="font-mono">${state.txid.substring(0, 16)}...</span></p>
                    <p class="mb-1">Amount Paid: 0.01 BTC</p>
                    <p>Network Fee: 0.00002 BTC</p>
                </div>
            </div>
        </div>
    `;
    
    // Update receiver UI with success
    elements.receiverUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Receiver's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                    Payment Received
                </span>
            </div>
            <div class="bg-white rounded p-3 shadow-sm">
                <div class="text-center py-2">
                    <i class="fas fa-check-circle text-green-500 text-3xl"></i>
                    <p class="text-sm font-medium text-green-700 mt-2">PayJoin Transaction Complete!</p>
                </div>
                <div class="mt-2 text-xs text-gray-600">
                    <p class="mb-1">TXID: <span class="font-mono">${state.txid.substring(0, 16)}...</span></p>
                    <p class="mb-1">Amount Received: 0.01499 BTC</p>
                    <p>Privacy: Enhanced with PayJoin</p>
                </div>
            </div>
        </div>
    `;
    
    // Update data flow visualization
    elements.dataFlowVisualization.innerHTML = `
        <div class="w-full">
            <div class="flex justify-between items-center">
                <div class="text-purple-500">
                    <i class="fas fa-store text-xl"></i>
                </div>
                <div class="flex-grow mx-4 relative">
                    <div class="h-0.5 bg-green-500 w-full absolute top-1/2"></div>
                </div>
                <div class="text-blue-500">
                    <i class="fas fa-mobile-alt text-xl"></i>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Transaction successfully broadcast to the Bitcoin network</div>
            </div>
        </div>
    `;
    
    // Show the mempool visualization
    elements.transactionVisualization.innerHTML = `
        <div class="w-full">
            <h4 class="text-center font-semibold mb-2">Transaction in Mempool</h4>
            <div class="mempool-block">
                <div class="mempool-tx highlight">
                    <div class="flex justify-between items-center">
                        <span class="status-indicator success"></span>
                        <span class="font-semibold">TXID: ${state.txid.substring(0, 10)}...</span>
                        <span class="text-xs text-gray-500">Fee: 5.9 sat/vB</span>
                    </div>
                    <div class="mt-1 text-xs">Inputs: 2 | Outputs: 2 | Size: 341 vB</div>
                    <div class="mt-2 text-xs bg-gray-100 p-1 rounded text-center">
                        <i class="fas fa-shield-alt text-purple-500 mr-1"></i>
                        <span class="text-gray-600">Looks like a regular transaction to blockchain observers</span>
                    </div>
                </div>
                <div class="mempool-tx opacity-70">
                    <div class="flex justify-between items-center">
                        <span class="status-indicator pending"></span>
                        <span class="font-semibold">TXID: 8f3a1c...</span>
                        <span class="text-xs text-gray-500">Fee: 4.2 sat/vB</span>
                    </div>
                </div>
                <div class="mempool-tx opacity-50">
                    <div class="flex justify-between items-center">
                        <span class="status-indicator pending"></span>
                        <span class="font-semibold">TXID: 2c91ab...</span>
                        <span class="text-xs text-gray-500">Fee: 3.8 sat/vB</span>
                    </div>
                </div>
                <div class="mt-4 text-center">
                    <div class="border-t border-gray-200 pt-3">
                        <p class="text-xs font-medium text-gray-700 mb-2">Privacy Analysis</p>
                        <div class="flex justify-center space-x-3">
                            <div class="px-2 py-1 bg-red-50 text-red-700 text-xs rounded border border-red-100">
                                <i class="fas fa-times-circle mr-1"></i> Common-input heuristic
                            </div>
                            <div class="px-2 py-1 bg-red-50 text-red-700 text-xs rounded border border-red-100">
                                <i class="fas fa-times-circle mr-1"></i> Address reuse
                            </div>
                            <div class="px-2 py-1 bg-red-50 text-red-700 text-xs rounded border border-red-100">
                                <i class="fas fa-times-circle mr-1"></i> Round amount
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Update the payjoin directory with final status
    elements.payjoinDirectory.innerHTML = `
        <div class="p-3 border-b border-gray-200">
            <div class="flex justify-between items-center mb-2">
                <p class="font-semibold text-gray-700">Original PSBT from Sender</p>
                <span class="text-xs text-gray-500">Processed</span>
            </div>
            <div class="bg-gray-100 p-2 rounded font-mono text-xs overflow-x-auto opacity-60">
                ${truncatePsbt(state.originalPsbt)}
            </div>
        </div>
        <div class="p-3 border-b border-gray-200">
            <div class="flex justify-between items-center mb-2">
                <p class="font-semibold text-gray-700">Payjoin PSBT from Receiver</p>
                <span class="text-xs text-gray-500">Processed</span>
            </div>
            <div class="bg-gray-100 p-2 rounded font-mono text-xs overflow-x-auto opacity-60">
                ${truncatePsbt(state.payjoinPsbt)}
            </div>
        </div>
        <div class="p-3">
            <div class="flex justify-between items-center mb-2">
                <p class="font-semibold text-gray-700">Final Transaction</p>
                <span class="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">Broadcast</span>
            </div>
            <div class="bg-green-50 border border-green-100 p-2 rounded font-mono text-xs overflow-x-auto highlight">
                TXID: ${state.txid}
            </div>
        </div>
    `;
    
    // Disable all buttons
    elements.broadcastBtn.disabled = true;
    
    // Add highlight animation
    highlightElement(elements.transactionVisualization);
    highlightElement(elements.senderUI);
    highlightElement(elements.receiverUI);
    highlightElement(elements.payjoinDirectory);
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

// Reset demo function
function resetDemo() {
    // Reset state
    state.currentStep = 'initial';
    state.senderStep = 'waiting';
    state.receiverStep = 'ready';
    state.bip21Uri = '';
    state.originalPsbt = '';
    state.payjoinPsbt = '';
    state.txid = '';
    state.activeStepNumber = 1;
    
    // Reset step indicators
    updateStepIndicator(1);
    
    // Reset UI elements
    updateSenderStatus('Waiting for receiver\'s payment request...');
    updateReceiverStatus('Ready to generate payment request...');
    
    // Reset sender and receiver views
    elements.senderUI.innerHTML = `
        <div class="text-center text-gray-400">
            <i class="fas fa-mobile-alt text-3xl mb-2"></i>
            <p>Wallet ready for payment</p>
        </div>
    `;
    
    elements.receiverUI.innerHTML = `
        <div class="text-center text-gray-400">
            <i class="fas fa-store text-3xl mb-2"></i>
            <p>Ready to receive payment</p>
        </div>
    `;
    
    // Reset visualization areas
    elements.dataFlowVisualization.innerHTML = `
        <div class="text-center text-gray-500">
            <i class="fas fa-exchange-alt text-3xl mb-2"></i>
            <p>Data flow visualization will appear here</p>
        </div>
    `;
    
    elements.payjoinDirectory.innerHTML = `
        <p class="text-gray-500 text-center">No data in the payjoin directory yet...</p>
    `;
    
    elements.transactionVisualization.innerHTML = `
        <div class="text-center text-gray-500">
            <i class="fas fa-exchange-alt text-3xl mb-2"></i>
            <p>Transaction visualization will appear here</p>
        </div>
    `;
    
    // Hide all code containers
    elements.codeContainers.bip21Container.classList.add('hidden');
    elements.codeContainers.originalPsbtContainer.classList.add('hidden');
    elements.codeContainers.payjoinPsbtContainer.classList.add('hidden');
    elements.codeContainers.txidContainer.classList.add('hidden');
    
    // Reset buttons
    elements.generateBip21Btn.disabled = false;
    elements.scanBtn.disabled = true;
    elements.createPsbtBtn.disabled = true;
    elements.sendPsbtBtn.disabled = true;
    elements.checkPsbtBtn.disabled = true;
    elements.createPayjoinBtn.disabled = true;
    elements.respondBtn.disabled = true;
    elements.signPayjoinBtn.disabled = true;
    elements.broadcastBtn.disabled = true;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
