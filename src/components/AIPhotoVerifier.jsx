import React, { useState } from 'react';
import { submitDamageClaim } from '../services/api';

export default function AIPhotoVerifier() {
  const [orderId, setOrderId] = useState('');
  const [damageScore, setDamageScore] = useState(0.5);
  const [claimResult, setClaimResult] = useState(null);

  const handleRefundClaim = (e) => {
    e.preventDefault();
    submitDamageClaim({ order_id: orderId, damage_score: damageScore })
      .then((res) => setClaimResult(res.data))
      .catch((err) => console.error(err));
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', margin: '20px 0' }}>
      <h3>AI Exception & Damage Refund Simulator</h3>
      <form onSubmit={handleRefundClaim}>
        <div style={{ marginBottom: '10px' }}>
          <label>Order ID: </label>
          <input type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Damage Severity Score (0.1 = Minor, 0.5 = Moderate, 0.8 = Severe): </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={damageScore}
            onChange={(e) => setDamageScore(parseFloat(e.target.value))}
            required
          />
        </div>
        <button type="submit">Submit Damage Claim to AI</button>
      </form>

      {claimResult && (
        <div style={{ marginTop: '15px', padding: '10px', background: '#e8f5e9', border: '1px solid #4caf50' }}>
          <h4>AI Decision Output:</h4>
          <p><strong>Approved Refund:</strong> {claimResult.refund_approved_percentage}%</p>
          <p>{claimResult.message}</p>
        </div>
      )}
    </div>
  );
}