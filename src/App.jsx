import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function App() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    product_name: "", product_code: "", quantity: 10, quality: "GOOD", expiry_date: "", aisle_location: "Aisle A1"
  });

  const [selectedProduct, setSelectedProduct] = useState("");
  const [orderQty, setOrderQty] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [pickImage, setPickImage] = useState(null);
  const [packImage, setPackImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const videoRef = useRef(null);

  const [otpOrderId, setOtpOrderId] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [inputOtp, setInputOtp] = useState("");
  const [otpStatusMsg, setOtpStatusMsg] = useState(null);

  const [damageOrderId, setDamageOrderId] = useState("");
  const [damageImage, setDamageImage] = useState(null);
  const [refundResult, setRefundResult] = useState(null);

  const STATUS_FLOW = ["PENDING", "ALLOCATED", "PICKED", "PACKED", "DISPATCHED", "DELIVERED"];

  useEffect(() => {
    fetchInventory();
    fetchOrders();
  }, []);

  const fetchInventory = () => {
    axios.get("http://127.0.0.1:8000/api/inventory")
      .then((res) => { setInventory(res.data); setLoading(false); })
      .catch((err) => console.error(err));
  };

  const fetchOrders = () => {
    axios.get("http://127.0.0.1:8000/api/orders")
      .then((res) => {
        setOrders(res.data);
        if (res.data.length > 0 && !selectedOrderId) {
          setSelectedOrderId(res.data[0].id.toString());
          setOtpOrderId(res.data[0].id.toString());
          setDamageOrderId(res.data[0].id.toString());
        }
      })
      .catch((err) => console.error(err));
  };

  const toggleSelectItem = (id) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === filteredInventory.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredInventory.map(i => i.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedItemIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedItemIds.length} item(s)?`)) {
      axios.post("http://127.0.0.1:8000/api/inventory/bulk-delete", { item_ids: selectedItemIds })
        .then((res) => {
          alert(`🗑️ ${res.data.message}`);
          setSelectedItemIds([]);
          fetchInventory();
        })
        .catch(() => alert("Failed to delete items."));
    }
  };

  const handleBulkRestock = () => {
    if (selectedItemIds.length === 0) return;
    axios.post("http://127.0.0.1:8000/api/inventory/bulk-restock", { item_ids: selectedItemIds })
      .then((res) => {
        alert(`✉️ ${res.data.message}`);
      })
      .catch(() => alert("Failed to send restock email."));
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!selectedProduct) return alert("Please select a product");
    if (!deliveryAddress.trim()) return alert("Please enter a valid delivery address.");

    axios.post("http://127.0.0.1:8000/api/orders/place", {
      product_code: selectedProduct,
      requested_qty: parseInt(orderQty),
      delivery_address: deliveryAddress
    })
      .then((res) => {
        alert(`✅ ${res.data.message}\n🤖 Distance: ${res.data.calculated_distance_km} km\n🏷️ Priority: ${res.data.priority}\n📦 Remaining Stock: ${res.data.remaining_stock}`);
        setDeliveryAddress("");
        fetchInventory();
        fetchOrders();
        setActiveTab("orders");
      })
      .catch((err) => alert(err.response?.data?.detail || "Order Placement Failed"));
  };

  const handleAdvanceStatus = (orderId, currentStatus) => {
    if (currentStatus === "DISPATCHED") {
      alert("🔒 Cannot advance directly! Switch to '🔑 5. OTP Verification' tab to enter Customer OTP.");
      return;
    }
    axios.post(`http://127.0.0.1:8000/api/orders/${orderId}/advance-status`)
      .then(() => fetchOrders())
      .catch((err) => alert(err.response?.data?.detail || "Status update failed."));
  };

  const handleSendOtp = () => {
    if (!otpOrderId) return;
    axios.post(`http://127.0.0.1:8000/api/orders/send-otp?order_id=${otpOrderId}`)
      .then((res) => {
        setGeneratedOtp(res.data.demo_otp);
        setOtpStatusMsg({ success: true, text: `📩 OTP Sent to Customer: ${res.data.demo_otp}` });
      })
      .catch((err) => setOtpStatusMsg({ success: false, text: err.response?.data?.detail || "Error sending OTP." }));
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    axios.post("http://127.0.0.1:8000/api/orders/verify-otp", {
      order_id: parseInt(otpOrderId),
      otp: inputOtp
    })
      .then((res) => {
        setOtpStatusMsg({ success: true, text: `✅ ${res.data.message}` });
        setInputOtp("");
        fetchOrders();
      })
      .catch((err) => setOtpStatusMsg({ success: false, text: err.response?.data?.detail || "Verification failed." }));
  };

  const handleDamageAssessment = (e) => {
    e.preventDefault();
    if (!damageImage) return alert("Please capture/select a photo first!");
    const formData = new FormData();
    formData.append("order_id", damageOrderId);
    formData.append("damage_image", damageImage);

    axios.post("http://127.0.0.1:8000/api/customer/assess-damage-refund", formData)
      .then((res) => setRefundResult(res.data))
      .catch(() => alert("Damage Assessment Failed."));
  };

  const handleSendCustomerMessage = (order) => {
    const goodQty = prompt(`Order #${order.id} requested ${order.requested_qty} units.\nHow many units are in GOOD condition?`, order.requested_qty - 1);
    if (goodQty === null) return;
    const damagedQty = order.requested_qty - parseInt(goodQty);

    axios.post("http://127.0.0.1:8000/api/orders/send-customer-message", {
      order_id: order.id,
      good_qty: parseInt(goodQty),
      damaged_qty: damagedQty > 0 ? damagedQty : 1
    }).then((res) => alert(`📩 MESSAGE SENT:\n\n"${res.data.sent_message}"`));
  };

  const handleAddInventory = (e) => {
    e.preventDefault();
    axios.post("http://127.0.0.1:8000/api/inventory/add", newItem)
      .then(() => {
        fetchInventory();
        setShowAddModal(false);
      });
  };

  const startCamera = (type) => {
    setCameraActive(type);
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch((err) => alert("Camera error: " + err));
  };

  const capturePhoto = (type) => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 300;
    canvas.height = video.videoHeight || 200;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], `${type}_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      if (type === "pick") setPickImage(file);
      if (type === "pack") setPackImage(file);
      if (type === "damage") setDamageImage(file);
      
      const stream = video.srcObject;
      if (stream) stream.getTracks().forEach(track => track.stop());
      setCameraActive(null);
    }, "image/jpeg");
  };

  const handleAiVerification = () => {
    if (!selectedOrderId) return alert("Please select an Order ID!");
    if (!pickImage || !packImage) return alert("Please capture both Picked and Packed photos!");
    
    const formData = new FormData();
    formData.append("order_id", selectedOrderId);
    formData.append("pick_image", pickImage);
    formData.append("pack_image", packImage);

    axios.post("http://127.0.0.1:8000/api/verify-pick-pack", formData)
      .then((res) => {
        setAiResult(res.data);
        fetchOrders();
      })
      .catch(() => setAiResult({ success: false, message: "Verification API Error." }));
  };

  const filteredInventory = inventory.filter(i => 
    i.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabStyle = (active) => ({
    padding: "10px 18px",
    backgroundColor: active ? "#0062E6" : "#fff",
    color: active ? "#fff" : "#333",
    border: "1px solid #ccc",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "0.2s"
  });

  const cardStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  };

  const inputModalStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    boxSizing: "border-box"
  };

  const cameraBoxStyle = {
    border: "2px dashed #0062E6",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center"
  };

  const btnStyle = {
    padding: "8px 16px",
    backgroundColor: "#0062E6",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold"
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: "#f0f2f5", minHeight: "100vh", padding: "20px" }}>
      <header style={{ background: "linear-gradient(135deg, #0062E6, #33AEFF)", padding: "25px", borderRadius: "12px", color: "#fff", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "2.3rem" }}>🛒 SMART WAREHOUSE MANAGEMENT SYSTEM</h1>
        <p style={{ margin: "5px 0 0", opacity: 0.9 }}>Expiry Auto-Clearance & AI Verification System</p>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", margin: "20px 0", flexWrap: "wrap" }}>
        <button onClick={() => setActiveTab("inventory")} style={tabStyle(activeTab === "inventory")}>📦 1. Inventory Control ({inventory.length})</button>
        <button onClick={() => setActiveTab("placeOrder")} style={tabStyle(activeTab === "placeOrder")}>🛒 2. Place Order</button>
        <button onClick={() => setActiveTab("pickpack")} style={tabStyle(activeTab === "pickpack")}>🤖 3. AI Camera Check</button>
        <button onClick={() => setActiveTab("orders")} style={tabStyle(activeTab === "orders")}>🚚 4. Order Management ({orders.length})</button>
        <button onClick={() => setActiveTab("otpVerification")} style={tabStyle(activeTab === "otpVerification")}>🔑 5. OTP Verification</button>
        <button onClick={() => setActiveTab("damageRefund")} style={tabStyle(activeTab === "damageRefund")}>🛡️ 6. AI Damage Refund</button>
      </div>

      {/* Tab 1: Inventory Control */}
      {activeTab === "inventory" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <input 
              type="text" 
              placeholder="🔍 Search items..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ padding: "10px", width: "300px", borderRadius: "6px", border: "1px solid #ccc" }} 
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setSelectedItemIds([]);
                }} 
                style={{
                  padding: "10px 18px", 
                  backgroundColor: isEditMode ? "#6c757d" : "#0062E6", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: "6px", 
                  fontWeight: "bold", 
                  cursor: "pointer"
                }}
              >
                {isEditMode ? "✖️ Exit Edit Mode" : "✏️ Edit Mode"}
              </button>

              <button 
                onClick={() => setShowAddModal(true)} 
                style={{ padding: "10px 18px", background: "#28a745", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
              >
                + Add Item
              </button>
            </div>
          </div>

          {loading ? <p>Loading Stock Items...</p> : (
            <div style={{ maxHeight: "480px", overflowY: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                    {isEditMode && (
                      <th style={{ padding: "12px", width: "40px", textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={selectedItemIds.length > 0 && selectedItemIds.length === filteredInventory.length} 
                          onChange={toggleSelectAll} 
                        />
                      </th>
                    )}
                    <th style={{ padding: "12px" }}>Product Name</th>
                    <th>Code</th>
                    <th>Quantity</th>
                    <th>Expiry Date</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #eee", backgroundColor: isSelected ? "#e8f0fe" : "transparent" }}>
                        {isEditMode && (
                          <td style={{ textAlign: "center" }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => toggleSelectItem(item.id)} 
                            />
                          </td>
                        )}
                        <td style={{ padding: "12px", fontWeight: "bold" }}>{item.product_name}</td>
                        <td><code>{item.product_code}</code></td>
                        <td style={{ fontWeight: "bold", color: item.quantity <= 3 ? "#dc3545" : "#333" }}>
                          {item.quantity} {item.quantity <= 3 && "(Low Stock)"}
                        </td>
                        <td>
                          <div>{item.expiry_date}</div>
                        </td>
                        <td style={{ color: "#666" }}>{item.aisle_location}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Dynamic Bottom Action Bar in Edit Mode */}
          {isEditMode && (
            <div style={{ marginTop: "15px", padding: "12px 20px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "bold", color: "#555" }}>
                {selectedItemIds.length} item(s) selected
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={handleBulkRestock} 
                  disabled={selectedItemIds.length === 0} 
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: selectedItemIds.length === 0 ? "#ccc" : "#17a2b8", color: "#fff", cursor: selectedItemIds.length === 0 ? "not-allowed" : "pointer", fontWeight: "bold" }}
                >
                  🔄 Restock Email
                </button>
                <button 
                  onClick={handleBulkDelete} 
                  disabled={selectedItemIds.length === 0} 
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: selectedItemIds.length === 0 ? "#ccc" : "#dc3545", color: "#fff", cursor: selectedItemIds.length === 0 ? "not-allowed" : "pointer", fontWeight: "bold" }}
                >
                  🗑️ Delete Selected
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Place Order */}
      {activeTab === "placeOrder" && (
        <div style={cardStyle}>
          <h2 style={{ color: "#0062E6", marginTop: 0 }}>🛒 Create New Customer Order</h2>
          
          <form onSubmit={handlePlaceOrder} style={{ maxWidth: "500px" }}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Select Item:</label>
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required style={inputModalStyle}>
                <option value="">-- Choose Inventory Product --</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.product_code}>
                    {item.product_name} ({item.product_code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Quantity Requested:</label>
              <input type="number" min="1" value={orderQty} onChange={(e) => setOrderQty(e.target.value)} required style={inputModalStyle} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Customer Delivery Address:</label>
              <textarea 
                rows="3"
                placeholder="e.g. Flat 402, Sunshine Apartments, Main Street, Downtown, Zip: 53001" 
                value={deliveryAddress} 
                onChange={(e) => setDeliveryAddress(e.target.value)} 
                required 
                style={{ ...inputModalStyle, height: "80px", resize: "vertical" }} 
              />
              <small style={{ color: "#666" }}>🤖 AI will parse this address to compute real distance from warehouse.</small>
            </div>

            <button type="submit" style={{ padding: "12px 20px", background: "#0062E6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", width: "100%" }}>
              📍 Auto-Calculate Distance & Place Order
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: AI Pick & Pack Verification */}
      {activeTab === "pickpack" && (
        <div style={cardStyle}>
          <h2 style={{ color: "#0062E6", marginTop: 0 }}>🤖 AI Pick & Pack Camera Verification</h2>
          <p>Successful verification advances the target order status to <strong>DISPATCHED</strong>.</p>
          
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontWeight: "bold", marginRight: "10px" }}>Select Order ID to Verify:</label>
            <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}>
              {orders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  Order #{ord.id} ({ord.product_code}) - Status: {ord.status}
                </option>
              ))}
            </select>
          </div>

          {cameraActive && (
            <div style={{ textAlign: "center", background: "#000", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
              <video ref={videoRef} autoPlay style={{ width: "100%", maxHeight: "300px", borderRadius: "8px" }} />
              <button onClick={() => capturePhoto(cameraActive)} style={{ marginTop: "10px", padding: "10px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                📸 Snap Photo Now
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={cameraBoxStyle}>
              <h4>1. Picked Item Photo</h4>
              {pickImage ? (
                <div>
                  <p style={{ color: "green", fontWeight: "bold" }}>✅ Photo Captured</p>
                  <button onClick={() => startCamera("pick")} style={{ ...btnStyle, backgroundColor: "#ffc107" }}>🔄 Retake Pick Photo</button>
                </div>
              ) : (
                <button onClick={() => startCamera("pick")} style={btnStyle}>📷 Capture Pick Photo</button>
              )}
            </div>
            <div style={{ ...cameraBoxStyle, borderColor: "#28a745" }}>
              <h4>2. Packed Order Box Photo</h4>
              {packImage ? (
                <div>
                  <p style={{ color: "green", fontWeight: "bold" }}>✅ Photo Captured</p>
                  <button onClick={() => startCamera("pack")} style={{ ...btnStyle, backgroundColor: "#ffc107" }}>🔄 Retake Packed Photo</button>
                </div>
              ) : (
                <button onClick={() => startCamera("pack")} style={btnStyle}>📷 Capture Pack Photo</button>
              )}
            </div>
          </div>

          <button onClick={handleAiVerification} style={{ width: "100%", marginTop: "20px", padding: "15px", background: "#0062E6", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer" }}>
            🤖 Run AI Verification Match Check
          </button>

          {aiResult && (
            <div style={{ marginTop: "20px", padding: "15px", borderRadius: "8px", backgroundColor: aiResult.success ? "#d4edda" : "#f8d7da", color: aiResult.success ? "#155724" : "#721c24" }}>
              <h3>{aiResult.success ? "✅ Order Verified & Dispatched!" : "❌ Mismatch Detected"}</h3>
              <p><strong>Confidence:</strong> {aiResult.match_confidence}</p>
              <p>{aiResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Order Management */}
      {activeTab === "orders" && (
        <div style={cardStyle}>
          <h2 style={{ color: "#0062E6", marginTop: 0 }}>🚚 Order Management & AI Priority Pipeline</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
            {orders.map((ord) => {
              const currentStepIdx = STATUS_FLOW.indexOf(ord.status);
              const priorityBg = ord.priority === "HIGH" ? "#dc3545" : ord.priority === "MEDIUM" ? "#fd7e14" : "#6c757d";
              return (
                <div key={ord.id} style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", border: "1px solid #e0e0e0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h3 style={{ margin: 0, color: "#333" }}>Order #{ord.id}</h3>
                        <span style={{ padding: "4px 10px", borderRadius: "12px", color: "#fff", fontSize: "0.8rem", fontWeight: "bold", backgroundColor: priorityBg }}>
                          AI Priority: {ord.priority} ({ord.distance_km} km)
                        </span>
                      </div>
                      <p style={{ margin: "5px 0 0", color: "#666", fontSize: "0.9rem" }}>
                        Product Code: <code>{ord.product_code}</code> | Requested Qty: <strong>{ord.requested_qty}</strong>
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => handleAdvanceStatus(ord.id, ord.status)} style={{ padding: "6px 12px", background: "#17a2b8", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                        ⏩ Next Status
                      </button>
                      <button onClick={() => handleSendCustomerMessage(ord)} style={{ padding: "6px 12px", background: "#ffc107", color: "#000", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                        📩 Inquiry
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", position: "relative", marginTop: "10px" }}>
                    {STATUS_FLOW.map((step, idx) => {
                      const isCompleted = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <div key={step} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                          <div style={{
                            width: "30px", height: "30px", borderRadius: "50%", margin: "0 auto",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            backgroundColor: isCompleted ? (isCurrent ? "#0062E6" : "#28a745") : "#e0e0e0",
                            color: "#fff", fontWeight: "bold", fontSize: "0.85rem",
                            boxShadow: isCurrent ? "0 0 8px rgba(0,98,230,0.6)" : "none"
                          }}>
                            {isCompleted ? "✓" : idx + 1}
                          </div>
                          <p style={{ fontSize: "0.75rem", fontWeight: isCurrent ? "bold" : "normal", color: isCurrent ? "#0062E6" : "#666", marginTop: "6px", margin: 0 }}>
                            {step}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: OTP Delivery Verification */}
      {activeTab === "otpVerification" && (
        <div style={cardStyle}>
          <h2 style={{ color: "#0062E6", marginTop: 0 }}>🔑 Delivery Partner OTP Verification Portal</h2>
          <p>Stage 6 (DELIVERED) is strictly locked until the customer provides the SMS OTP at their doorstep.</p>

          <div style={{ maxWidth: "500px", background: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #ddd" }}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Select Dispatched Order:</label>
              <select value={otpOrderId} onChange={(e) => setOtpOrderId(e.target.value)} style={inputModalStyle}>
                {orders.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    Order #{ord.id} ({ord.product_code}) - Current Status: {ord.status}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={handleSendOtp} style={{ width: "100%", padding: "10px", background: "#17a2b8", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", marginBottom: "15px" }}>
              📲 Send OTP to Customer's Registered Phone
            </button>

            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Enter Customer OTP:</label>
                <input type="text" placeholder="Enter 6-digit OTP" value={inputOtp} onChange={(e) => setInputOtp(e.target.value)} required style={inputModalStyle} />
              </div>
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#28a745", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                ✅ Verify OTP & Complete Delivery
              </button>
            </form>

            {otpStatusMsg && (
              <div style={{ marginTop: "15px", padding: "10px", borderRadius: "6px", backgroundColor: otpStatusMsg.success ? "#d4edda" : "#f8d7da", color: otpStatusMsg.success ? "#155724" : "#721c24" }}>
                {otpStatusMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: AI Damage Refund */}
      {activeTab === "damageRefund" && (
        <div style={cardStyle}>
          <h2 style={{ color: "#0062E6", marginTop: 0 }}>🛡️ AI Customer Damage Inspection & Refund System</h2>
          <p>Customers can upload a photo of damaged items to receive instant AI refund recommendations.</p>

          <form onSubmit={handleDamageAssessment} style={{ maxWidth: "500px" }}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Select Delivered Order:</label>
              <select value={damageOrderId} onChange={(e) => setDamageOrderId(e.target.value)} style={inputModalStyle}>
                {orders.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    Order #{ord.id} ({ord.product_code}) - Status: {ord.status}
                  </option>
                ))}
              </select>
            </div>

            {cameraActive === "damage" && (
              <div style={{ textAlign: "center", background: "#000", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
                <video ref={videoRef} autoPlay style={{ width: "100%", maxHeight: "250px", borderRadius: "8px" }} />
                <button type="button" onClick={() => capturePhoto("damage")} style={{ marginTop: "10px", padding: "8px 16px", background: "#28a745", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                  📸 Snap Damage Photo
                </button>
              </div>
            )}

            <div style={{ ...cameraBoxStyle, marginBottom: "15px" }}>
              <h4>Upload / Snap Damaged Product Photo</h4>
              {damageImage ? (
                <div>
                  <p style={{ color: "green", fontWeight: "bold" }}>✅ Photo Selected</p>
                  <button type="button" onClick={() => startCamera("damage")} style={{ ...btnStyle, backgroundColor: "#ffc107" }}>🔄 Retake Photo</button>
                </div>
              ) : (
                <button type="button" onClick={() => startCamera("damage")} style={btnStyle}>📷 Capture Damage Photo</button>
              )}
            </div>

            <button type="submit" style={{ width: "100%", padding: "12px", background: "#0062E6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
              🤖 Assess Damage & Process Refund
            </button>
          </form>

          {refundResult && (
            <div style={{ marginTop: "20px", padding: "15px", borderRadius: "8px", backgroundColor: "#d4edda", color: "#155724" }}>
              <h3>✅ Refund Processed</h3>
              <p><strong>Approved Amount:</strong> ₹{refundResult.refund_amount}</p>
              <p>{refundResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "25px", borderRadius: "10px", width: "400px" }}>
            <h3>+ Add New Inventory Item</h3>
            <form onSubmit={handleAddInventory}>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>Product Name:</label>
                <input type="text" required value={newItem.product_name} onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })} style={inputModalStyle} />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>Product Code:</label>
                <input type="text" required value={newItem.product_code} onChange={(e) => setNewItem({ ...newItem, product_code: e.target.value })} style={inputModalStyle} />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>Quantity:</label>
                <input type="number" required min="1" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })} style={inputModalStyle} />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>Expiry Date:</label>
                <input type="date" required value={newItem.expiry_date} onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })} style={inputModalStyle} />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>Aisle Location:</label>
                <input type="text" value={newItem.aisle_location} onChange={(e) => setNewItem({ ...newItem, aisle_location: e.target.value })} style={inputModalStyle} />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: "8px 16px", background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", background: "#28a745", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}