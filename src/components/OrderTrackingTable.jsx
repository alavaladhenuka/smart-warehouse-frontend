import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function OrderTrackingTable() {
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    axios.get('/api/orders/tracking')
      .then(res => setTracks(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Order Status Tracking</h2>
      <table border="1" cellPadding="10" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th>Order ID</th>
            <th>Current Status</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((row) => (
            <tr key={row.id}>
              <td>#{row.order_id}</td>
              <td><strong>{row.status}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}