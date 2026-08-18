// REPLACE or ADD this code in frontend/src/components/ProductCard.jsx

import React from 'react';

export default function ProductCard({ originalPrice, discountPercentage }) {
  // Calculate final price dynamically using percentage
  const discountAmount = (originalPrice * discountPercentage) / 100;
  const finalPrice = originalPrice - discountAmount;

  return (
    <div className="product-card border p-4 rounded-lg shadow">
      <h3 className="text-xl font-bold">Product Item</h3>
      <p>Original Price: ₹{originalPrice}</p>
      
      {discountPercentage > 0 ? (
        <div className="mt-2">
          {/* Displays Percentage, NOT Rupees */}
          <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
            {discountPercentage}% OFF
          </span>
          <p className="text-lg font-semibold text-green-600 mt-1">
            Final Price: ₹{finalPrice}
          </p>
        </div>
      ) : (
        <p className="text-gray-500 mt-2">No discount applicable</p>
      )}
    </div>
  );
}