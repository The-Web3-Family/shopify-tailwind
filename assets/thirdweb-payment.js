import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
} from 'thirdweb';
import { solana } from 'thirdweb/chains';
import { createWalletAdapter } from 'thirdweb/wallets';

class ThirdwebPayment extends HTMLElement {
  constructor() {
    super();
    this.client = null;
    this.wallet = null;
    this.contract = null;
    this.isProcessing = false;
  }

  connectedCallback() {
    this.initializeThirdweb();
    this.setupEventListeners();
  }

  async initializeThirdweb() {
    try {
      // Initialize Thirdweb client
      this.client = createThirdwebClient({
        clientId: this.dataset.clientId || 'YOUR_THIRDWEB_CLIENT_ID',
      });

      // Initialize wallet adapter
      this.wallet = createWalletAdapter({
        client: this.client,
        chain: solana,
        wallet: 'phantom', // or "solflare", "backpack", etc.
      });

      // Connect wallet
      await this.wallet.connect();

      console.log('Thirdweb initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Thirdweb:', error);
      this.showError('Failed to connect wallet. Please try again.');
    }
  }

  setupEventListeners() {
    const payButton = this.querySelector('[data-thirdweb-pay]');
    if (payButton) {
      payButton.addEventListener('click', this.handlePayment.bind(this));
    }
  }

  async handlePayment(event) {
    event.preventDefault();

    if (this.isProcessing) return;

    this.isProcessing = true;
    this.updateButtonState(true);

    try {
      const cartData = this.getCartData();
      const totalAmount = this.calculateTotal(cartData);

      // Convert USD to SOL (you'll need to implement price conversion)
      const solAmount = await this.convertUSDToSOL(totalAmount);

      // Create payment transaction
      const transaction = await this.createPaymentTransaction(
        solAmount,
        cartData,
      );

      // Send transaction
      const result = await sendTransaction({
        account: this.wallet.account,
        transaction: transaction,
      });

      // Wait for confirmation
      const receipt = await waitForReceipt({
        client: this.client,
        chain: solana,
        transactionHash: result.transactionHash,
      });

      if (receipt.status === 'success') {
        this.handlePaymentSuccess(receipt, cartData);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      this.showError('Payment failed. Please try again.');
    } finally {
      this.isProcessing = false;
      this.updateButtonState(false);
    }
  }

  getCartData() {
    // Get cart data from Shopify
    const cartItems = document.querySelectorAll('.cart-item');
    const items = Array.from(cartItems).map((item) => ({
      id: item.dataset.variantId,
      quantity: parseInt(item.querySelector('.quantity-input').value),
      price: parseFloat(item.dataset.price),
      title: item.querySelector('.cart-item__name').textContent.trim(),
    }));

    return {
      items,
      total: this.calculateTotal({ items }),
      currency: 'USD',
    };
  }

  calculateTotal(cartData) {
    return cartData.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }

  async convertUSDToSOL(usdAmount) {
    // You'll need to implement this using a price API like CoinGecko
    // For now, using a placeholder conversion rate
    const SOL_PRICE_USD = 100; // Replace with actual SOL price
    return usdAmount / SOL_PRICE_USD;
  }

  async createPaymentTransaction(solAmount, cartData) {
    // Create a simple SOL transfer transaction
    // In a real implementation, you might want to use a payment contract
    return {
      to: this.dataset.merchantWallet, // Your merchant wallet address
      value: BigInt(Math.floor(solAmount * 1e9)), // Convert to lamports
      data: this.encodeCartData(cartData),
    };
  }

  encodeCartData(cartData) {
    // Encode cart data for the transaction
    return JSON.stringify({
      items: cartData.items,
      timestamp: Date.now(),
      orderId: this.generateOrderId(),
    });
  }

  generateOrderId() {
    return (
      'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    );
  }

  async handlePaymentSuccess(receipt, cartData) {
    // Send payment confirmation to your backend
    try {
      const response = await fetch('/apps/thirdweb/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionHash: receipt.transactionHash,
          cartData: cartData,
          orderId: this.generateOrderId(),
        }),
      });

      if (response.ok) {
        this.showSuccess('Payment successful! Your order is being processed.');
        this.clearCart();
        // Redirect to success page or show confirmation
        window.location.href = '/pages/order-confirmation';
      } else {
        throw new Error('Failed to confirm payment');
      }
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      this.showError(
        'Payment successful but confirmation failed. Please contact support.',
      );
    }
  }

  clearCart() {
    // Clear the cart after successful payment
    const clearCartForm = document.createElement('form');
    clearCartForm.method = 'POST';
    clearCartForm.action = '/cart/clear';

    const csrfToken = document.querySelector('meta[name="csrf-token"]');
    if (csrfToken) {
      const csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = 'authenticity_token';
      csrfInput.value = csrfToken.content;
      clearCartForm.appendChild(csrfInput);
    }

    document.body.appendChild(clearCartForm);
    clearCartForm.submit();
  }

  updateButtonState(processing) {
    const button = this.querySelector('[data-thirdweb-pay]');
    if (button) {
      button.disabled = processing;
      button.textContent = processing ? 'Processing...' : 'Pay with Solana';
    }
  }

  showError(message) {
    // Show error message to user
    const errorDiv = document.createElement('div');
    errorDiv.className = 'thirdweb-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText =
      'color: red; padding: 10px; margin: 10px 0; background: #fee; border: 1px solid #fcc; border-radius: 4px;';

    this.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  showSuccess(message) {
    // Show success message to user
    const successDiv = document.createElement('div');
    successDiv.className = 'thirdweb-success';
    successDiv.textContent = message;
    successDiv.style.cssText =
      'color: green; padding: 10px; margin: 10px 0; background: #efe; border: 1px solid #cfc; border-radius: 4px;';

    this.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 5000);
  }
}

customElements.define('thirdweb-payment', ThirdwebPayment);
