import React, { useState, useCallback, memo } from 'react';
import { payments } from '../api';

/**
 * RazorpayCheckout Component
 * 
 * Handles the complete payment flow:
 * 1. Creates an order on the backend
 * 2. Opens the Razorpay Standard Checkout modal
 * 3. Verifies the payment signature on the backend
 */
const RazorpayCheckout = memo(({ game, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      // 1. Create order on backend
      // Backend expects gameId. Amount is calculated server-side for security.
      const { data: orderData } = await payments.createOrder({
        gameId: game.id,
      });

      // If game is free, backend handles it immediately
      if (orderData.free) {
        onSuccess && onSuccess(orderData);
        setLoading(false);
        return;
      }

      // 2. Configure Razorpay options
      const options = {
        key: orderData.razorpayKeyId, // Your Test/Live Key ID
        amount: orderData.amount,    // Amount in paise
        currency: orderData.currency || "INR",
        language: "en",
        name: "LazPlay",
        description: `Purchase ${game.title}`,
        image: "/favicon.svg",
        order_id: orderData.razorpayOrderId, // Real Razorpay Order ID from backend
        handler: async (response) => {
          setLoading(true);
          try {
            // 3. Verify payment on backend
            // This checks the HMAC-SHA256 signature
            const { data: verifyData } = await payments.verifyPayment({
              internalOrderId: orderData.internalOrderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            
            onSuccess && onSuccess(verifyData);
          } catch (err) {
            console.error("Payment verification failed", err);
            const errorMsg = err.response?.data?.message || "Payment verification failed. Please contact support.";
            onError && onError(errorMsg);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: "", 
          email: "",
          contact: "",
        },
        notes: {
          game_id: game.id,
          internal_order_id: orderData.internalOrderId
        },
        theme: {
          color: "#39ff14", // LazPlay Green
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded. Please check your internet connection.");
      }

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        console.error("Payment failed", response.error);
        onError && onError(response.error.description || "Payment failed");
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      console.error("Order creation failed", err);
      const msg = err.message || err.response?.data?.message || "Failed to initiate payment. Are you logged in?";
      onError && onError(msg);
      setLoading(false);
    }
  }, [game, loading, onSuccess, onError]);

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-primary-container text-on-primary-container py-3 pixel-border neon-glow hover:bg-primary-fixed transition-all uppercase flex justify-center items-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <span className={`material-symbols-outlined ${loading ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`}>
        {loading ? 'sync' : (game.priceType === 'FREE' ? 'download' : 'shopping_cart')}
      </span>
      {loading 
        ? 'PROCESSING...' 
        : (game.priceType === 'FREE' 
            ? 'GET FOR FREE' 
            : `PURCHASE - ₹${(game.price / 100).toFixed(2)}`
          )
      }
    </button>
  );
});

export default RazorpayCheckout;
