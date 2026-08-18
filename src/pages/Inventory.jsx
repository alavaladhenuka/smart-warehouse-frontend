import React, { useEffect, useState } from 'react';
import { fetchInventory } from '../services/api';

export default function Inventory() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchInventory()
      .then((res) => setItems(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Smart Warehouse Inventory & Stock Monitoring</h2>
      <table border="1" cellPadding="10" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th>Product Name</th>
            <th>Code</th>
            <th>Qty</th>
            <th>Quality</th>
            <th>Location</th>
            <th>Expiry Date</th>
            <th>Active Discount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.product_name}</td>
              <td><code>{item.product_code}</code></td>
              <td style={{ color: item.quantity <= 2 ? 'red' : 'black', fontWeight: item.quantity <= 2 ? 'bold' : 'normal' }}>
                {item.quantity} {item.quantity <= 2 && '(Low Stock)'}
              </td>
              <td>{item.quality}</td>
              <td>{item.aisle_location || 'N/A'}</td>
              <td>{item.expiry_date}</td>
              <td>
                {item.discount_percentage > 0 ? (
                  <span style={{ background: '#e1f5fe', color: '#0288d1', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    {item.discount_percentage}% OFF
                  </span>
                ) : (
                  'None'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}