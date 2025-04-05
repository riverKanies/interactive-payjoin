
import {  Wallet, EsploraClient, FeeRate, Recipient, Address, Amount, Psbt, SignOptions } from 'bitcoindevkit';
import { Uri, Receiver, SenderBuilder, InputPair } from 'payjoindevkit';

const network = "signet";

// Some relays below. If you get a timeout error, try a different relay.
// const ohttpRelay = "https://pj.benalleng.com";
// const ohttpRelay = "https://ohttp.cakewallet.com";// down
const ohttpRelay = "https://pj.bobspacebkk.com";


// Note: ohttpkeys are the same for all three relays, guess they're specific to the endpoint only
const ohttpKeys = "OH1QYP87E2AVMDKXDTU6R25WCPQ5ZUF02XHNPA65JMD8ZA2W4YRQN6UUWG"
// if these don't work you can get the new keys for the default gateway using payjoin-cli fetch-keys https://github.com/payjoin/rust-payjoin/pull/589

const payjoinDirectory = "https://payjo.in";

function createInputPairWithTx(utxo) {
    return InputPair.new(
        utxo.outpoint.txid.toString(), // Txid to string
        utxo.outpoint.vout, // number
        BigInt(utxo.txout.value.to_sat()), // Amount to satoshis (bigint)
        utxo.txout.script_pubkey.as_bytes() // ScriptBuf as bytes
    )
}

async function senderStep2() {
    const {senderWallet, sendGetContext} = window.payjoinState
    // SENDER STEP 2
    console.log('sender step 2', sendGetContext);
    const res = await sendGetContext.extract_req(ohttpRelay);
    console.log(res);
    const {request, ohttp_ctx} = res
    console.log(request, request.url, request.content_type, request.body);
    console.log(ohttp_ctx);
    const response = await fetch(request.url, {
        method: 'POST',
        headers: {
            'Content-Type': request.content_type
        },
        body: request.body
    })
    console.log('sender step 2', response);
    const result = await response.bytes();
    const checkedPayjoinProposalPsbt = sendGetContext.process_response(result, ohttp_ctx);
    console.log(checkedPayjoinProposalPsbt);

    // Convert PSBT string to PSBT object
    let payjoinPsbt = Psbt.from_string(checkedPayjoinProposalPsbt);

    // Sign the PSBT with the wallet
    senderWallet.sign(payjoinPsbt);

    // Extract the final transaction
    let finalTx = payjoinPsbt.extract_tx();
    console.log("ready to broadcast", finalTx);

    const client = new EsploraClient("https://mutinynet.com/api");
    // const broadcasted = await client.broadcast(finalTx)
    // console.log("broadcasted", broadcasted);

    // a completed payjoin tx using this demo app:
    // https://mutinynet.com/tx/f90380bdb2284a7586a386017177257d2454aab100f2a21d5ed2a6e3baf48f6e
}

async function createPjUri() {
    const {receiverWallet} = window.payjoinState
    const addressInfo = receiverWallet.reveal_addresses_to("external", 3)[0]
    const address = addressInfo.address.toString()

    const receiver = Receiver.new(
        address,
        network,
        payjoinDirectory,
        ohttpKeys,
        ohttpRelay
    );
    
    // got the pj_uri for the sender to use:
    const pjUriString = receiver.pj_uri().as_string

    window.payjoinState.receiver = receiver;
    window.payjoinState.pjUriString = pjUriString;

    return pjUriString;
}

async function createOriginalPsbt() {
    const {senderWallet, pjUriString, receiver} = window.payjoinState;
    // TODO: Make variables
    console.log({pjUriString, network})
    const psbt = senderWallet.build_tx()
        .fee_rate(new FeeRate(BigInt(4)))
        .add_recipient(new Recipient(Address.from_string(receiver.pj_uri().address.toString(), network),
            Amount.from_sat(BigInt(8000))))
        .finish();
    const psbtString = psbt.toString();
    window.payjoinState.psbtString = psbtString;
    return psbtString;
}

async function senderStep1() {
    const {pjUriString, psbtString} = window.payjoinState;
    const bip21Uri = Uri.parse(pjUriString);
    console.log(bip21Uri.address());
    const pjUri = bip21Uri.check_pj_supported();
    console.log(pjUri.as_string);

    const psbt = Psbt.from_string(psbtString);
    // console.log(psbt.to_json());

    const senderBuilder = SenderBuilder.from_psbt_and_uri(psbtString, pjUri);
    console.log(senderBuilder);
    const sender = senderBuilder.build_recommended(BigInt(4));
    console.log(sender);
    // getting context consumes the object, destructuring makes that seem natural
    const {request, context} = sender.extract_v2(ohttpRelay);
    console.log(request);
    console.log(request.url);
    console.log(request.content_type);
    // console.log(request.body);
    
    const response = await fetch(request.url, {
        method: 'POST',
        headers: {
            'Content-Type': request.content_type
        },
        body: request.body//psbtString
    });
    console.log('session', response);
    if (response.ok) {
        console.log('session start success');
    } else {
        console.log('session failed, check ohttp keys');
        throw('session failed', response);
    }
    const result = await response.bytes();
    console.log(result);

    // consumes post context
    const sendGetContext = context.process_response(result);
    console.log(sendGetContext);
    // throws error bc post context is consumed
    // const sendGetContext2 = context.process_response(result);
    // console.log(sendGetContext2);

    window.payjoinState.sendGetContext = sendGetContext;
}

async function receiverStep1() {
    const {sendGetContext, receiver, receiverWallet} = window.payjoinState;
    console.log("preparing for receiver to add inputTx", sendGetContext);

    const {request, client_response} = await receiver.extract_req(ohttpRelay);
    console.log("receiver extracted request", request);
    console.log("receiver extracted client_response", client_response);

    // get fallback psbt
    console.log(request);
    console.log(request.url);
    console.log(request.content_type);
    // console.log(request.body);
    const response = await fetch(request.url, {
        method: 'POST',
        headers: {
            'Content-Type': request.content_type
        },
        body: request.body//psbtString
    });
    console.log('fallback response', response);
    if (response.ok) {
        console.log('fallback success');
    } else {
        return console.log('fallback failed', response);
    }
    const result = await response.bytes();
    console.log(result);

    const proposal = await receiver.process_res(result, client_response);
    console.log(proposal);
    const maybeInputsOwned = proposal.check_broadcast_suitability(null, true)
    console.log(maybeInputsOwned);
    const maybeInputsSeen = maybeInputsOwned.check_inputs_not_owned((input) => {
        console.log(input);
        // need to actually confirm the sender input is not owned by receiver
        return false;
    })
    console.log(maybeInputsSeen);

    const outputsUnknown = maybeInputsSeen.check_no_inputs_seen_before((outpoint) => {
        console.log(outpoint);
        // need to actually confirm the output hasn't been seen before
        return false;
    })
    console.log(outputsUnknown);

    const wantsOutputs = outputsUnknown.identify_receiver_outputs((outputScript) => {
        console.log(outputScript);
        // need to actually confirm the output is owned by receiver
        return true;
    })
    console.log(wantsOutputs);

    const wantsInputs = wantsOutputs.commit_outputs()
    console.log(wantsInputs);

    const inputs = receiverWallet.list_unspent().map((utxo) => createInputPairWithTx(utxo))
    console.log(inputs);

    const provisionalProposal = wantsInputs.contribute_inputs(inputs).commit_inputs()
    console.log(provisionalProposal);

    const payjoinProposal = provisionalProposal.finalize_proposal(
        (psbt) => {
            console.log('signing receiver inputs', psbt);
            // final check
            const psbtObj = Psbt.from_string(psbt)
            console.log(psbtObj);
            console.log(psbtObj.to_json());
            console.log(receiverWallet)
            try {
                const options = new SignOptions()
                console.log(options)
                options.trust_witness_utxo = true
                receiverWallet.sign_with_options(psbtObj, options);
            } catch (e) {
                console.error('sign err', e);
            }
            console.log('signed', psbtObj);
            return psbtObj.toString()
        },
        BigInt(1),
        BigInt(2)
    )

    let { request: finalRequest, client_response: finalContext } = payjoinProposal.extract_v2_req(ohttpRelay);
    let responsePayjoin = await fetch(finalRequest.url, {
        method: 'POST',
        headers: {
            'Content-Type': finalRequest.content_type
        },
        body: finalRequest.body
    });
    console.log('finalized', responsePayjoin);
    if (responsePayjoin.ok) {
        console.log('final proposal submitted success');
    } else {
        throw('finalized submition failed', responsePayjoin);
    }
    const responseData = await responsePayjoin.bytes();
    await payjoinProposal.process_res(responseData, finalContext);// what does this do?
}

async function initSenderAndReceiverWallets() {
    // generated descriptors using book of bdk descriptor example
    const senderDescriptorExternal = "tr(tprv8ZgxMBicQKsPeAndhG7FXuuk57oVpo4Y7xtUitrJyBRFnBHCCpLQofZZ7EZWcwB3zo8BLsJe8Qo5HeShP2zFoMx1zAA8PGnNGbfPozA4SvX/86'/1'/0'/0/*)#kkng6m9y"
    const senderDescriptorInternal = "tr(tprv8ZgxMBicQKsPeAndhG7FXuuk57oVpo4Y7xtUitrJyBRFnBHCCpLQofZZ7EZWcwB3zo8BLsJe8Qo5HeShP2zFoMx1zAA8PGnNGbfPozA4SvX/86'/1'/0'/1/*)#8zkf8w4u"

    const receiverDescriptorExternal = "tr(tprv8ZgxMBicQKsPdXaSHpSS8nXLfpPunAfEEs7K86ESCroA95iZbaxYyxgqNYurfnA85rKf7fXpqTcgtWC3w8cssERRxZtMafDmrYgRfp12PZw/86'/1'/0'/0/*)#vjm92l0u"
    const receiverDescriptorInternal = "tr(tprv8ZgxMBicQKsPdXaSHpSS8nXLfpPunAfEEs7K86ESCroA95iZbaxYyxgqNYurfnA85rKf7fXpqTcgtWC3w8cssERRxZtMafDmrYgRfp12PZw/86'/1'/0'/1/*)#ax7yh2ly"

    const senderWallet = Wallet.create(network, senderDescriptorExternal, senderDescriptorInternal);
    const receiverWallet = Wallet.create(network, receiverDescriptorExternal, receiverDescriptorInternal);

    const client = new EsploraClient("https://mutinynet.com/api");
    // get sats from faucet: https://faucet.mutinynet.com/

    console.log("Receiver syncing...");
    let receiver_scan_request = receiverWallet.start_full_scan();
    let receiver_update = await client.full_scan(receiver_scan_request, 5, 1);
    receiverWallet.apply_update(receiver_update);
    console.log("Balance:", receiverWallet.balance.confirmed.to_sat());
    // console.log("New address:", receiverWallet.reveal_next_address().address);
    console.log("Transaction ID:", receiverWallet.list_unspent()[0].outpoint.txid.toString());

    console.log("Sender syncing...");
    let sender_scan_request = senderWallet.start_full_scan();
    let sender_update = await client.full_scan(sender_scan_request, 5, 1);
    senderWallet.apply_update(sender_update);
    console.log("Balance:", senderWallet.balance.confirmed.to_sat());
    console.log("New address:", senderWallet.reveal_next_address().address.toString());


    return {senderWallet, receiverWallet};
}


initSenderAndReceiverWallets().then(({receiverWallet, senderWallet}) => {
    document.getElementById('receiver-balance').textContent = receiverWallet.balance.confirmed.to_sat();
    document.getElementById('sender-balance').textContent = senderWallet.balance.confirmed.to_sat();

    window.payjoinState.receiverWallet = receiverWallet
    window.payjoinState.senderWallet = senderWallet
})


// ---------
// 
// 
// 
// ---------


// Payjoin Demo Script

// Demo state management
const state = {
    currentStep: 'initial',
    senderStep: 'waiting',
    receiverStep: 'ready',
    bip21Uri: '',
    originalPsbt: '',
    payjoinPsbt: '',
    txid: '',
    activeStepNumber: 1,
    payjoinVersion: 2,
    ohttpRelay: 'https://relay.payjoin.org',
    payjoinDirectory: 'https://directory.payjoin.org'
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
    
    // Explanation element
    stepExplanation: document.getElementById('step-explanation'),
    
    // Sender elements
    senderStatus: document.getElementById('sender-status'),
    senderUI: document.getElementById('sender-ui'),
    
    // Receiver buttons
    createPayjoinBtn: document.getElementById('create-payjoin-btn'),
    respondBtn: document.getElementById('respond-btn'),
    scanBtn: document.getElementById('scan-btn'),
    createPsbtBtn: document.getElementById('create-psbt-btn'),
    sendPsbtBtn: document.getElementById('send-psbt-btn'),
    signPayjoinBtn: document.getElementById('sign-payjoin-btn'),
    broadcastBtn: document.getElementById('broadcast-btn'),
    
    // Receiver elements
    receiverStatus: document.getElementById('receiver-status'),
    receiverUI: document.getElementById('receiver-ui'),
    ohttpRelayInput: document.getElementById('ohttp-relay'),
    payjoinDirectoryInput: document.getElementById('payjoin-directory'),
    generateBip21Btn: document.getElementById('generate-bip21-btn'),
    checkPsbtBtn: document.getElementById('check-psbt-btn'),
    createPayjoinBtn: document.getElementById('create-payjoin-btn'),
    respondBtn: document.getElementById('respond-btn'),
    resetBtn: document.getElementById('reset-btn'),
    
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
    // Payjoin v2 BIP21 format includes payjoin info in BIP21 URI
    bip21: 'bitcoin:bc1qxyz123abc456def789ghi0jklmn0pqrstuvwxyz?amount=0.01&pj=v2&pjos=https://relay.payjoin.org&pjpd=https://directory.payjoin.org/1a2b3c4d5e6f',
    originalPsbt: 'cHNidP8BAHECAAAAAUlmL+oX8QYJQZBDWRxYsw5L0SNUp4ro5xr7aBNag8RVAAAAAIABAAAAAAD/////AhAnAAAAAAAAFgAU8AKGF1zIVqK8D+M2q9HBQrP3ahsBBwAAAAAAABYAFMYz73pT2TLOYshV+qtmzSqYRRYqAAAAAAABAIkCAAAAAZ0NOgZ1iCsVv7D0yEF5FyR92u8gV5MCYdWbzVFnQY12AAAAAP3///8C2AkAAAAAAAAWABTKWFfqrKJBV3Gg7J4xhHN9LywzXoNrBgAAAAAAFgAUR7BZ9rXCEBLiZE073WAnUBtJbI0AAAAAAQA/AgAAAAH4PLOkoNcV3FuL0yA+zXUVdeQtkfZnA8mKR9CpKSHNzQAAAAAA/v///wLYCQAAAAAAABYAFK4wLnFAJVQQgwrM+1gcGTj1ZrroQrEHAAAAAAAWABR7JTprv5R3F+k7WMdEXKRbpYXrZgAAAAABAP0CAAAAAf5hRQKcfDaT4ZmEFNXTQEcf8hZ6G1NHBkmVLfKlyBKYAAAAAAD+////AhAnAAAAAAAAFgAUaBrR6xW1u5FOvZxP3M/Vw2qrUFLYCwAAAAAAABYAFHCmeRNQsECTPzcHwGRTP20J1zGTAAAAAAA=',
    payjoinPsbt: 'cHNidP8BAJoCAAAAAklmL+oX8QYJQZBDWRxYsw5L0SNUp4ro5xr7aBNag8RVAAAAAAD/////g7UNFO0CY8HVD+f3Q8dh5pMQFTN+n9I7Y8ykwsrKZxsAAAAAAP////8CECcAAAAAAAAWABTwAoYXXMhWorwP4zar0cFCs/dqGwEHAAAAAAAAFgAUxjPvelPZMs5iyFX6q2bNKphFFioAAAAAAAEAiQIAAAABnQ06BnWIKxW/sPTIQXkXJH3a7yBXkwJh1ZvNUWdBjXYAAAAA/f///wLYCQAAAAAAABYAFMpYV+qsokFXcaDsnjGEc30vLDNeg2sGAAAAAAAWABRHsFn2tcIQEuJkTTvdYCdQG0lsjQAAAAABAD8CAAAAAf... truncated for demo purposes ...',
    txid: '7e7962b3e3d02b6d5c4c79ce4142f979f41c838723121c68cb3acc325329e620',
    receiverAddress: 'bc1qxyz123abc456def789ghi0jklmn0pqrstuvwxyz',
    amount: '0.01 BTC',
    // For v2, we separate these parameters
    ohttpRelay: 'https://relay.payjoin.org',
    payjoinDirectoryId: '1a2b3c4d5e6f'
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
    elements.resetBtn.addEventListener('click', resetDemo);

    window.payjoinState = {}
    
    // Add event listeners for step buttons
    
    // Set initial active participant
    setActiveParticipant('receiver');
    updateReceiverStep(1, 'current', 'Generate a payment request with Payjoin v2 support to enable better privacy for Bitcoin transactions.');
    
    // Initialize reset button text
    elements.resetBtn.innerHTML = '<i class="fas fa-redo-alt mr-2"></i>Reset Demo';
    
    // Add event listeners to config inputs
    elements.ohttpRelayInput.addEventListener('change', function() {
        state.ohttpRelay = this.value;
    });
    
    elements.payjoinDirectoryInput.addEventListener('change', function() {
        state.payjoinDirectory = this.value;
    });
    
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
async function handleGenerateBip21() {

    // Get the values from the input fields
    state.ohttpRelay = elements.ohttpRelayInput.value;
    state.payjoinDirectory = elements.payjoinDirectoryInput.value;
    

    // Extract directory ID from the URL (assuming last path component is the ID)
    const directoryUrlParts = state.payjoinDirectory.split('/');
    const directoryId = directoryUrlParts[directoryUrlParts.length - 1];
    
    // Generate a v2 BIP21 URI with custom relay and directory
    state.bip21Uri = await createPjUri();
    state.receiverStep = 'bip21_generated';
    updateStepIndicator(1);
    
    // Update UI
    updateReceiverStatus('Generated BIP21 payment request with Payjoin v2 configuration');
    
    // Show the BIP21 URI in the code container for easy copying
    elements.codeContainers.bip21Code.textContent = state.bip21Uri;
    elements.codeContainers.bip21Container.classList.remove('hidden');
    
    // Show QR section and hide generate button
    const qrSection = document.getElementById('qr-section');
    const generateButton = document.getElementById('generate-bip21-btn');
    
    // Show the QR section
    qrSection.classList.remove('hidden');
    
    // Hide the generate button with fade
    generateButton.style.transition = 'opacity 0.3s ease-in-out';
    generateButton.classList.add('hidden-fade');
    
    // Update step UI
    updateReceiverStep(1, 'completed', 'Payment request generated. Now the sender can scan the QR code.');
    
    // Switch active participant to sender
    setActiveParticipant('sender');
    updateSenderStep(1, 'current', 'Scan the QR code to get payment details with Payjoin v2 support.');

    // Update the bitcoin-qr component with the new BIP21 URI
    const qrComponent = document.getElementById('payment-qr');
    if (qrComponent) {
        // Force a re-render by removing and re-adding the component
        console.log(state.bip21Uri)
        const parent = qrComponent.parentNode;
        const oldQr = qrComponent;
        const newQr = oldQr.cloneNode(true);
        newQr.setAttribute('unified', state.bip21Uri);
        
        // Start with opacity 0
        newQr.classList.remove('show');
        parent.replaceChild(newQr, oldQr);
        
        // Trigger reflow and add show class for animation
        newQr.offsetHeight;
        newQr.classList.add('show');
    }

    // Update status and show request details
    const requestDetails = document.createElement('div');
    requestDetails.className = 'mt-8 text-center';
    requestDetails.innerHTML = `
        <div class="bg-purple-100 text-purple-800 text-xs font-semibold rounded px-2 py-1 inline-block mb-4">
            Payjoin v2 Request Generated
        </div>
        <div class="text-sm space-y-2">
            <p class="font-semibold">Request details:</p>
            <p class="text-gray-600">Amount: <span class="font-mono">${mockData.amount}</span></p>
            <p class="text-gray-600">Address: <span class="font-mono text-xs">${mockData.receiverAddress.substring(0, 10)}...</span></p>
            <p class="text-gray-600">Payjoin: <span class="text-green-600">v2 Enabled</span></p>
            <p class="text-gray-600">OHTTP Relay: <span class="font-mono text-xs">${state.ohttpRelay.substring(0, 18)}...</span></p>
            <p class="text-gray-600">Directory: <span class="font-mono text-xs">${state.payjoinDirectory.substring(0, 18)}...</span></p>
        </div>
    `;

    // Clear any existing request details and append new ones
    const existingDetails = elements.receiverUI.querySelector('.request-details');
    if (existingDetails) {
        existingDetails.remove();
    }
    requestDetails.classList.add('request-details');
    elements.receiverUI.appendChild(requestDetails);
    
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
                ${state.bip21Uri}
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
    
    // Update step UI
    updateSenderStep(1, 'completed', 'Payment request scanned successfully.');
    updateSenderStep(2, 'current', 'Now create an original PSBT (Partially Signed Bitcoin Transaction) to start the payment process.');
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
    
    // Update step UI
    updateSenderStep(2, 'completed', 'Original PSBT created successfully.');
    updateSenderStep(3, 'current', 'Now send the PSBT to the Payjoin directory for the receiver to process.');

    createOriginalPsbt();
}

function handleSendOriginalPsbt() {
    // Update state
    state.senderStep = 'psbt_sent';
    updateStepIndicator(4);
    
    // Update UI with Payjoin v2 language
    updateSenderStatus(`Original PSBT sent through OHTTP relay (${state.ohttpRelay}) to Payjoin directory. Waiting for proposal...`);
    
    // Update sender UI with sending status 
    elements.senderUI.innerHTML = `
        <h3 class="text-center text-sm font-semibold mb-3 text-gray-700">Sender's View</h3>
        <div class="bg-gray-100 p-3 rounded-lg">
            <div class="text-center mb-3">
                <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                    PSBT Sent via Payjoin v2
                </span>
            </div>
            <div class="bg-white rounded p-3 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-semibold text-gray-700">Submission Status</span>
                    <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Pending Response</span>
                </div>
                <div class="text-xs mb-2">
                    <div class="flex justify-between">
                        <span>OHTTP Relay:</span>
                        <span class="font-mono">${state.ohttpRelay.substring(0, 15)}...</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Payjoin Directory:</span>
                        <span class="font-mono">${state.payjoinDirectory.substring(0, 15)}...</span>
                    </div>
                </div>
                <div class="text-center mt-4 mb-4">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p class="text-sm text-gray-600 mt-2">Waiting for receiver to create Payjoin...</p>
                </div>
            </div>
        </div>
    `;
    
    // Update data flow visualization to show the Payjoin v2 flow
    elements.dataFlowVisualization.innerHTML = `
        <div class="w-full">
            <div class="flex flex-col gap-4">
                <div class="w-full text-center bg-gray-50 rounded-lg p-2">
                    <span class="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">Payjoin v2 Protocol Flow</span>
                </div>

                <div class="flex items-center justify-between">
                    <div class="text-blue-500 text-center">
                        <i class="fas fa-mobile-alt text-xl"></i>
                        <p class="text-xs mt-1">Sender</p>
                    </div>
                    
                    <div class="h-px w-14 bg-blue-400 relative animate-pulse">
                        <div class="absolute -top-1 right-0 animate-ping">
                            <i class="fas fa-circle text-blue-500 text-xs"></i>
                        </div>
                    </div>
                    
                    <div class="text-gray-600 bg-gray-100 p-2 rounded-lg text-center">
                        <i class="fas fa-random text-sm"></i>
                        <p class="text-xs mt-1">OHTTP Relay</p>
                    </div>
                    
                    <div class="h-px w-14 bg-blue-400 relative animate-pulse">
                        <div class="absolute -top-1 right-0 animate-ping">
                            <i class="fas fa-circle text-blue-500 text-xs"></i>
                        </div>
                    </div>
                    
                    <div class="text-gray-600 bg-gray-100 p-2 rounded-lg text-center">
                        <i class="fas fa-server text-sm"></i>
                        <p class="text-xs mt-1">Payjoin Directory</p>
                    </div>
                    
                    <div class="h-px w-14 bg-blue-400 relative animate-pulse">
                        <div class="absolute -top-1 right-0 animate-ping">
                            <i class="fas fa-circle text-blue-500 text-xs"></i>
                        </div>
                    </div>
                    
                    <div class="text-purple-500 text-center opacity-70">
                        <i class="fas fa-store text-xl"></i>
                        <p class="text-xs mt-1">Receiver</p>
                    </div>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">(4) PSBT sent via v2 protocol through OHTTP relay to Payjoin directory</div>
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

    senderStep1()

    updateSenderStep(3, 'completed', 'Original PSBT sent.'); 
    updateReceiverStep(2, 'current', 'Check Original PSBT');
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
    elements.createPayjoinBtn.disabled = true;
    elements.createPayjoinBtn.classList.add('opacity-0');
    elements.respondBtn.disabled = false;
    elements.respondBtn.classList.remove('opacity-0');
    
    // Add highlight animation
    highlightElement(elements.receiverUI);

    receiverStep1()

    updateReceiverStep(2, 'completed', 'Check Original PSBT');
    updateReceiverStep(3, 'current', 'Create Payjoin PSBT');
}

function handleCreatePayjoinPsbt() {
    // Update state
    state.payjoinPsbt = mockData.payjoinPsbt;
    state.receiverStep = 'payjoin_created';
    updateStepIndicator(4);
    
    // Update UI
    updateReceiverStatus('Payjoin PSBT created. Ready to respond to sender.');
    
    // Update step UI
    updateReceiverStep(3, 'completed', 'Payjoin PSBT created successfully.');
    updateReceiverStep(4, 'current', 'Ready to send the Payjoin PSBT back to the sender.');
    
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

    senderStep2()
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

// New helper functions for step UI
function setActiveParticipant(participant) {
    // Reset both to inactive
    document.getElementById('sender-container').classList.remove('sender-active');
    document.getElementById('receiver-container').classList.remove('receiver-active');
    document.getElementById('sender-container').classList.add('sender-inactive');
    document.getElementById('receiver-container').classList.add('receiver-inactive');
    
    // Set the active one
    if (participant === 'sender') {
        document.getElementById('sender-container').classList.remove('sender-inactive');
        document.getElementById('sender-container').classList.add('sender-active');
        document.getElementById('sender-step-description').classList.remove('hidden');
        document.getElementById('receiver-step-description').classList.add('hidden');
    } else if (participant === 'receiver') {
        document.getElementById('receiver-container').classList.remove('receiver-inactive');
        document.getElementById('receiver-container').classList.add('receiver-active');
        document.getElementById('receiver-step-description').classList.remove('hidden');
        document.getElementById('sender-step-description').classList.add('hidden');
    }
}

// Update the central step explanation panel
function updateStepExplanation(stepNumber, explanation) {
    if (elements.stepExplanation && explanation) {
        elements.stepExplanation.innerHTML = `<p>${explanation}</p>`;
        // Update the main step indicator if needed
        updateStepIndicator(stepNumber);
    }
}

function updateSenderStep(stepNumber, status, description) {
    // Reset all steps
    for (let i = 1; i <= 5; i++) {
        const stepElement = document.getElementById(`sender-step-${i}`);
        stepElement.classList.remove('step-current', 'step-completed');
        stepElement.classList.add('opacity-50');
        
        const buttonElement = stepElement.querySelector('button');
        if (buttonElement) {
            buttonElement.classList.add('opacity-0');
            buttonElement.disabled = true;
        }
    }
    
    // Update the current step
    const currentStep = document.getElementById(`sender-step-${stepNumber}`);
    currentStep.classList.remove('opacity-50');
    
    if (status === 'current') {
        currentStep.classList.add('step-current');
        const buttonElement = currentStep.querySelector('button');
        if (buttonElement) {
            buttonElement.classList.remove('opacity-0');
            buttonElement.disabled = false;
        }
    } else if (status === 'completed') {
        currentStep.classList.add('step-completed');
    }
    
    // Update description if provided
    if (description) {
        document.getElementById('sender-step-description').innerHTML = `<p>${description}</p>`;
        // Also update the main explanation
        updateStepExplanation(stepNumber, description);
    }
}

function updateReceiverStep(stepNumber, status, description) {
    // Reset all steps
    for (let i = 1; i <= 4; i++) {
        const stepElement = document.getElementById(`receiver-step-${i}`);
        stepElement.classList.remove('step-current', 'step-completed');
        stepElement.classList.add('opacity-50');
        
        const buttonElement = stepElement.querySelector('button');
        if (buttonElement) {
            buttonElement.classList.add('opacity-0');
            buttonElement.disabled = true;
        }
    }
    
    // Update the current step
    const currentStep = document.getElementById(`receiver-step-${stepNumber}`);
    currentStep.classList.remove('opacity-50');
    
    if (status === 'current') {
        currentStep.classList.add('step-current');
        const buttonElement = currentStep.querySelector('button');
        if (buttonElement) {
            buttonElement.classList.remove('opacity-0');
            buttonElement.disabled = false;
        }
    } else if (status === 'completed') {
        currentStep.classList.add('step-completed');
    }
    
    // Update description if provided
    if (description) {
        document.getElementById('receiver-step-description').innerHTML = `<p>${description}</p>`;
        // Also update the main explanation
        updateStepExplanation(stepNumber, description);
    }
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
    window.location.reload();
}

init();
