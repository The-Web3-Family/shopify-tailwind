class ThirdwebSolanaSend extends HTMLElement {
  constructor() {
    super();
    this.client = null;
    this.wallet = null;
    this.isProcessing = false;
    this.solAmount = parseFloat(this.dataset.solAmount || '0.1');
  }

  connectedCallback() {
    this.initializeThirdweb();
    this.setupEventListeners();
  }

  async initializeThirdweb() {
    try {
      // Check if Thirdweb is available
      if (typeof window.Thirdweb === 'undefined') {
        console.error('Thirdweb is not loaded');
        this.showError('Thirdweb is not available. Please refresh the page.');
        return;
      }

      // Initialize Thirdweb client
      this.client = window.Thirdweb.createThirdwebClient({
        clientId: this.dataset.clientId || 'YOUR_THIRDWEB_CLIENT_ID',
      });

      // Initialize wallet adapter
      this.wallet = window.Thirdweb.createWalletAdapter({
        client: this.client,
        chain: window.Thirdweb.solana,
        wallet: 'phantom', // Default to Phantom, but could be made configurable
      });

      console.log('Thirdweb Solana Send initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Thirdweb:', error);
      this.showError(
        'Failed to initialize wallet connection. Please try again.',
      );
    }
  }

  setupEventListeners() {
    const sendButton = this.querySelector('[data-thirdweb-send]');
    if (sendButton) {
      sendButton.addEventListener('click', this.handleSend.bind(this));
    }
  }

  async handleSend(event) {
    event.preventDefault();

    if (this.isProcessing) return;

    this.isProcessing = true;
    this.updateButtonState(true);

    try {
      // Connect wallet if not already connected
      if (!this.wallet.account) {
        await this.wallet.connect();
      }

      // Get merchant wallet address
      const merchantWallet = this.dataset.merchantWallet;
      if (!merchantWallet) {
        throw new Error('Merchant wallet address not configured');
      }

      // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
      const lamports = Math.floor(this.solAmount * 1e9);

      // Create transaction
      const transaction = await this.createSolTransferTransaction(
        merchantWallet,
        lamports,
      );

      // Send transaction
      const result = await window.Thirdweb.sendTransaction({
        account: this.wallet.account,
        transaction: transaction,
      });

      // Wait for confirmation
      const receipt = await window.Thirdweb.waitForReceipt({
        client: this.client,
        chain: window.Thirdweb.solana,
        transactionHash: result.transactionHash,
      });

      if (receipt.status === 'success') {
        this.handleSendSuccess(receipt);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('SOL send failed:', error);
      this.showError(`Failed to send SOL: ${error.message}`);
    } finally {
      this.isProcessing = false;
      this.updateButtonState(false);
    }
  }

  async createSolTransferTransaction(toAddress, lamports) {
    // Create a simple SOL transfer transaction
    // This is a simplified version - in production you might want to use a more robust approach
    return {
      to: toAddress,
      value: BigInt(lamports),
      data: '0x', // Empty data for simple transfer
    };
  }

  async handleSendSuccess(receipt) {
    this.showSuccess(
      `Successfully sent ${this.solAmount} SOL! Transaction: ${receipt.transactionHash}`,
    );

    // Optional: Track the transaction or send to analytics
    this.trackTransaction(receipt);
  }

  trackTransaction(receipt) {
    // Optional: Send transaction data to analytics or backend
    if (typeof gtag !== 'undefined') {
      gtag('event', 'solana_send', {
        transaction_id: receipt.transactionHash,
        value: this.solAmount,
        currency: 'SOL',
      });
    }
  }

  updateButtonState(processing) {
    const button = this.querySelector('[data-thirdweb-send]');
    if (button) {
      button.disabled = processing;

      if (processing) {
        button.innerHTML = '<span class="thirdweb-loading"></span> Sending...';
      } else {
        const buttonText = this.dataset.buttonText || 'Send SOL';
        button.innerHTML = `<span class="solana-icon">🪙</span> ${buttonText}`;
      }
    }
  }

  showError(message) {
    this.clearMessages();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'thirdweb-error';
    errorDiv.textContent = message;
    this.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 10000);
  }

  showSuccess(message) {
    this.clearMessages();
    const successDiv = document.createElement('div');
    successDiv.className = 'thirdweb-success';
    successDiv.textContent = message;
    this.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 10000);
  }

  clearMessages() {
    const existingMessages = this.querySelectorAll(
      '.thirdweb-error, .thirdweb-success',
    );
    existingMessages.forEach((msg) => msg.remove());
  }
}

// Register the custom element
customElements.define('thirdweb-solana-send', ThirdwebSolanaSend);
