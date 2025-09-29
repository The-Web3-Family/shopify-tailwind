// This would typically be a Shopify Function or app endpoint
// For now, this is a client-side handler

class ThirdwebPaymentHandler {
  static async confirmPayment(transactionHash, cartData, orderId) {
    try {
      // In a real implementation, this would call your backend
      const response = await fetch('/apps/thirdweb/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          transactionHash,
          cartData,
          orderId,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('Payment confirmation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error;
    }
  }

  static async getSOLPrice() {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      );
      const data = await response.json();
      return data.solana.usd;
    } catch (error) {
      console.error('Failed to fetch SOL price:', error);
      return 100; // Fallback price
    }
  }
}

// Make it globally available
window.ThirdwebPaymentHandler = ThirdwebPaymentHandler;
