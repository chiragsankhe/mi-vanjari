import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, get, post } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { Icon, Modal, Spinner } from '../ui';

const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = RAZORPAY_SRC;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load the payment window. Check your internet connection.'));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

const until = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Matrimony membership checkout.
 *   const { pay, busy, dialog } = useMembershipCheckout();  …  <button onClick={pay}>  …  {dialog}
 * Live: Razorpay Checkout (UPI / cards / net banking) → server verifies the signature and the payment.
 * Development without keys: a clearly-labelled test checkout (no real money).
 */
export function useMembershipCheckout({ onPaid } = {}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [testOrder, setTestOrder] = useState(null);

  const finish = async (result) => {
    const me = await get('/users/me');
    useAuth.getState().setUser((u) => ({ ...me, adminSession: u?.adminSession }));
    qc.invalidateQueries();
    if (result.status === 'PAID') {
      const m = result.membership;
      toast.success(m.active ? `Membership active until ${until(m.expiresAt)} 🎉` : `Payment received! Your year runs ${until(m.startsAt)} – ${until(m.expiresAt)} 🎉`);
      onPaid?.(result);
    } else toast.info('Payment is being confirmed by the bank. Your membership will activate in a few minutes.');
  };

  const pay = async () => {
    setBusy(true);
    try {
      const order = await post('/payments/order');
      if (order.mode === 'test') {
        setTestOrder(order);
        return;
      }
      await loadRazorpay();
      await new Promise((resolve) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: 'Mi Vanjari · मी वंजारी',
          description: order.description,
          prefill: order.prefill,
          notes: { receipt: order.receipt },
          theme: { color: '#C8411A' },
          handler: async (resp) => {
            try {
              const result = await post('/payments/verify', { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
              await finish(result);
            } catch (err) {
              toast.error(errorMessage(err));
            }
            resolve();
          },
          modal: {
            confirm_close: true,
            ondismiss: () => {
              post('/payments/failed', { orderId: order.orderId, reason: 'Checkout closed' }).catch(() => {});
              resolve();
            },
          },
        });
        rzp.on('payment.failed', (r) => {
          post('/payments/failed', { orderId: order.orderId, reason: r?.error?.description }).catch(() => {});
          toast.error(r?.error?.description || 'Payment failed. No money was taken — please try again.');
        });
        rzp.open();
      });
    } catch (err) {
      toast.error(errorMessage(err, err?.message));
    } finally {
      setBusy(false);
    }
  };

  const [completing, setCompleting] = useState(false);
  const dialog = testOrder && (
    <Modal
      open
      onClose={() => {
        post('/payments/failed', { orderId: testOrder.orderId, reason: 'Test checkout closed' }).catch(() => {});
        setTestOrder(null);
        setBusy(false);
      }}
      label="Test payment"
    >
      <div className="p-6">
        <span className="rounded-full bg-[#fff5da] px-2.5 py-1 text-[11px] font-bold text-[#8c6100]">TEST MODE · no real money</span>
        <h2 className="mt-3 font-serif text-xl font-semibold">Pay ₹{testOrder.amount / 100}</h2>
        <p className="mt-1 text-sm text-muted">
          {testOrder.description}. Razorpay keys are not configured yet, so this simulated checkout is shown in development only. With keys, members see the real Razorpay window (UPI, cards, net banking).
        </p>
        <p className="mt-3 font-mono text-[11px] text-muted">Receipt {testOrder.receipt}</p>
        <button
          className="btn btn-primary mt-5 w-full"
          disabled={completing}
          onClick={async () => {
            setCompleting(true);
            try {
              const result = await post('/payments/test-complete', { orderId: testOrder.orderId });
              setTestOrder(null);
              await finish(result);
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setCompleting(false);
              setBusy(false);
            }
          }}
        >
          {completing ? <Spinner size={16} /> : <><Icon name="check" size={16} /> Simulate successful payment</>}
        </button>
      </div>
    </Modal>
  );

  return { pay, busy, dialog };
}
