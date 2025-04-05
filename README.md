# PayJoin Interactive Demo

An interactive web demonstration of the Bitcoin PayJoin protocol, showing how it enhances transaction privacy by breaking common blockchain analysis heuristics.

## Overview

This demo illustrates the PayJoin process with a split-screen interface showing both sender and receiver sides in real-time. It visualizes:

- BIP21 payment request generation with PayJoin endpoint
- Original PSBT creation and transmission
- PayJoin PSBT creation by the receiver
- The final transaction broadcast and mempool visualization

## Features

- Interactive step-by-step demonstration of the PayJoin process
- Visual representation of transaction inputs and outputs
- Simulated payjoin directory showing data exchange
- Mempool visualization of the final transaction

## Future Enhancements

This demo will be enhanced to implement actual WASM functions using the PayJoin Development Kit, based on the example from: https://github.com/riverKanies/payjoin-wasm-example-app/

## Running the Demo

Simply serve the project directory with any HTTP server. For example:

```bash
python -m http.server
# or
npx serve
```

Then open your browser to the specified local address (typically http://localhost:8000 or similar).

## Resources

- [PayJoin.org](https://payjoin.org/)
- [PayJoin Development Kit](https://payjoindevkit.org/)

## About PayJoin

PayJoin is a Bitcoin privacy technique that makes it harder for blockchain surveillance to track the flow of funds. It works by having the receiver contribute inputs to the transaction, breaking common blockchain analysis heuristics like the common-input-ownership assumption.
