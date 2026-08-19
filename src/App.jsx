import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

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
  const [showStockOverview, setShowStockOverview] = useState(false);
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [qrManualValue, setQrManualValue] = useState("");
  const qrScannerRef = useRef(null);

  const STATUS_FLOW = ["PENDING", "ALLOCATED", "PICKED", "PACKED", "DISPATCHED", "DELIVERED"];

  useEffect(() => {
    fetchInventory();
    fetchOrders();
  }, []);

  const fetchInventory = () => {
    axios.get(`${API_BASE_URL}/inventory`)
      .then((res) => { setInventory(res.data); setLoading(false); })
      .catch((err) => console.error(err));
  };

  const fetchOrders = () => {
    axios.get(`${API_BASE_URL}/orders`)
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
      axios.post(`${API_BASE_URL}/inventory/bulk-delete`, { item_ids: selectedItemIds })
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
    axios.post(`${API_BASE_URL}/inventory/bulk-restock`, { item_ids: selectedItemIds })
      .then((res) => {
        alert(`✉️ ${res.data.message}`);
      })
      .catch(() => alert("Failed to send restock email."));
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!selectedProduct) return alert("Please select a product");
    if (!deliveryAddress.trim()) return alert("Please enter a valid delivery address.");

    axios.post(`${API_BASE_URL}/orders/place`, {
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
    axios.post(`${API_BASE_URL}/orders/${orderId}/advance-status`)
      .then(() => fetchOrders())
      .catch((err) => alert(err.response?.data?.detail || "Status update failed."));
  };

  const handleSendOtp = () => {
    if (!otpOrderId) return;
    axios.post(`${API_BASE_URL}/orders/send-otp?order_id=${otpOrderId}`)
      .then((res) => {
        setGeneratedOtp(res.data.demo_otp);
        setOtpStatusMsg({ success: true, text: `📩 OTP Sent to Customer: ${res.data.demo_otp}` });
      })
      .catch((err) => setOtpStatusMsg({ success: false, text: err.response?.data?.detail || "Error sending OTP." }));
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    axios.post(`${API_BASE_URL}/orders/verify-otp`, {
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

    axios.post(`${API_BASE_URL}/customer/assess-damage-refund`, formData)
      .then((res) => setRefundResult(res.data))
      .catch(() => alert("Damage Assessment Failed."));
  };

  const handleInventoryInquiry = () => {
    setShowStockOverview((prev) => !prev);
  };

  const handleOpenOtpVerification = (orderId) => {
    setOtpOrderId(String(orderId));
    setActiveTab("otpVerification");
  };

  const handleSingleRestock = (itemId, itemName) => {
    axios.post(`${API_BASE_URL}/inventory/bulk-restock`, { item_ids: [itemId] })
      .then((res) => {
        alert(`✅ ${res.data.message}`);
      })
      .catch(() => alert(`Failed to restock ${itemName}.`));
  };

  const parseQrCodePayload = (payload) => {
    if (!payload) return null;

    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === "object") {
        return {
          product_name: parsed.product_name || parsed.name || "",
          product_code: parsed.product_code || parsed.code || "",
          quantity: parsed.quantity ? Number(parsed.quantity) : 10,
          expiry_date: parsed.expiry_date || parsed.expiry || "",
          aisle_location: parsed.aisle_location || parsed.location || "Aisle A1"
        };
      }
    } catch (error) {
      // ignore JSON parse failure and try plain-text format below
    }

    const cleaned = payload.trim();
    if (cleaned.includes("|")) {
      const parts = cleaned.split("|").map((part) => part.trim());
      return {
        product_name: parts[0] || "",
        product_code: parts[1] || "",
        quantity: parts[2] ? Number(parts[2]) : 10,
        expiry_date: parts[3] || "",
        aisle_location: parts[4] || "Aisle A1"
      };
    }

    if (cleaned.includes(",")) {
      const parts = cleaned.split(",").map((part) => part.trim());
      return {
        product_name: parts[0] || "",
        product_code: parts[1] || "",
        quantity: parts[2] ? Number(parts[2]) : 10,
        expiry_date: parts[3] || "",
        aisle_location: parts[4] || "Aisle A1"
      };
    }

    return { product_name: "", product_code: cleaned, quantity: 10, expiry_date: "", aisle_location: "Aisle A1" };
  };

  const stopQrScanner = () => {
    if (qrScannerRef.current) {
      const stream = qrScannerRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      qrScannerRef.current = null;
    }
    setIsQrScanning(false);
  };

  const handleQrScanSuccess = (decodedText) => {
    const parsedData = parseQrCodePayload(decodedText);
    if (!parsedData) return;

    setNewItem((prev) => ({
      ...prev,
      product_name: parsedData.product_name || prev.product_name,
      product_code: parsedData.product_code || prev.product_code,
      quantity: parsedData.quantity || prev.quantity,
      expiry_date: parsedData.expiry_date || prev.expiry_date,
      aisle_location: parsedData.aisle_location || prev.aisle_location
    }));

    setQrManualValue("");
    stopQrScanner();
    alert("QR code scanned successfully. Product details have been filled in.");
  };

  const startQrScan = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("This browser does not support camera scanning. Please paste the QR value manually.");
      return;
    }

    setIsQrScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.getElementById("qr-video");
      if (video) {
        video.srcObject = stream;
        qrScannerRef.current = video;
        video.play();
      }

      const detector = typeof window.BarcodeDetector !== "undefined"
        ? new window.BarcodeDetector({ formats: ["qr_code"] })
        : null;

      if (!detector) {
        alert("QR scanning is not supported in this browser. Please paste the QR value manually.");
        stopQrScanner();
        return;
      }

      const scanFrame = async () => {
        if (!qrScannerRef.current || !isQrScanning) return;

        try {
          const barcodes = await detector.detect(qrScannerRef.current);
          if (barcodes && barcodes.length > 0) {
            const value = barcodes[0].rawValue;
            if (value) {
              handleQrScanSuccess(value);
              return;
            }
          }
        } catch (error) {
          // Ignore scan errors and keep polling.
        }

        requestAnimationFrame(scanFrame);
      };

      requestAnimationFrame(scanFrame);
    } catch (error) {
      alert("Camera access was blocked. Please paste the QR value manually instead.");
      setIsQrScanning(false);
    }
  };

  const handleAddInventory = (e) => {
    e.preventDefault();
    axios.post(`${API_BASE_URL}/inventory/add`, newItem)
      .then(() => {
        fetchInventory();
        stopQrScanner();
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

    axios.post(`${API_BASE_URL}/verify-pick-pack`, formData)
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
    background: "linear-gradient(135deg, #fffdf5 0%, #eef7ff 35%, #f5f3ff 100%)",
    padding: "22px",
    borderRadius: "18px",
    boxShadow: "0 16px 36px rgba(99, 102, 241, 0.12)",
    border: "1px solid rgba(99, 102, 241, 0.10)"
  };

  const lowStockCount = inventory.filter((item) => item.quantity <= 5).length;
  const expiringSoonCount = inventory.filter((item) => item.days_until_expiry <= 30).length;

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
      <header style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 30%, #06b6d4 100%)", padding: "28px", borderRadius: "16px", color: "#fff", textAlign: "center", boxShadow: "0 16px 28px rgba(79, 70, 229, 0.22)" }}>
        <h1 style={{ margin: 0, fontSize: "2.3rem", letterSpacing: "0.04em" }}>SMART WAREHOUSE MANAGEMENT SYSTEM</h1>
        <p style={{ margin: "8px 0 0", opacity: 0.96, fontSize: "1rem" }}>Expiry Auto-Clearance & AI Verification System</p>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", margin: "20px 0", flexWrap: "wrap" }}>
        <button onClick={() => setActiveTab("inventory")} style={tabStyle(activeTab === "inventory")}>1. Inventory Control ({inventory.length})</button>
        <button onClick={() => setActiveTab("placeOrder")} style={tabStyle(activeTab === "placeOrder")}>2. Place Order</button>
        <button onClick={() => setActiveTab("pickpack")} style={tabStyle(activeTab === "pickpack")}>3. AI Camera Check</button>
        <button onClick={() => setActiveTab("otpVerification")} style={tabStyle(activeTab === "otpVerification")}>4. OTP Verification</button>
        <button onClick={() => setActiveTab("orders")} style={tabStyle(activeTab === "orders")}>5. Order Management ({orders.length})</button>
        <button onClick={() => setActiveTab("damageRefund")} style={tabStyle(activeTab === "damageRefund")}>6. AI Damage Refund</button>
      </div>

      {/* Tab 1: Inventory Control */}
      {activeTab === "inventory" && (
        <div style={cardStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "18px" }}>
            <div style={{ background: "linear-gradient(135deg, #e0f2fe, #dbeafe)", padding: "16px", borderRadius: "14px" }}>
              <div style={{ color: "#1d4ed8", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>Total Products</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "8px", color: "#0f172a" }}>{inventory.length}</div>
            </div>
            <div style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)", padding: "16px", borderRadius: "14px" }}>
              <div style={{ color: "#92400e", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>Low Stock</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "8px", color: "#0f172a" }}>{lowStockCount}</div>
            </div>
            <div style={{ background: "linear-gradient(135deg, #dcfce7, #bbf7d0)", padding: "16px", borderRadius: "14px" }}>
              <div style={{ color: "#166534", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>Expiring Soon</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "8px", color: "#0f172a" }}>{expiringSoonCount}</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", gap: "10px", flexWrap: "wrap" }}>
            <input 
              type="text" 
              placeholder="🔍 Search items..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ padding: "12px 14px", width: "300px", borderRadius: "10px", border: "1px solid #dbeafe", background: "#fff", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)" }} 
            />
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button 
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setSelectedItemIds([]);
                }} 
                style={{
                  padding: "10px 18px",
                  backgroundColor: isEditMode ? "#6c757d" : "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 8px 18px rgba(37, 99, 235, 0.18)"
                }}
              >
                {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
              </button>

              <button 
                onClick={() => setShowAddModal(true)} 
                style={{ padding: "10px 18px", background: "linear-gradient(135deg, #16a34a, #22c55e)", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 8px 18px rgba(34, 197, 94, 0.18)" }}
              >
                Add Item
              </button>
            </div>
          </div>

          {loading ? <p>Loading Stock Items...</p> : (
            <div style={{ maxHeight: "480px", overflowY: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #dbeafe" }}>
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: isSelected ? "#eff6ff" : "transparent" }}>
                        {isEditMode && (
                          <td style={{ textAlign: "center" }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => toggleSelectItem(item.id)} 
                            />
                          </td>
                        )}
                        <td style={{ padding: "12px", fontWeight: "bold", color: "#0f172a" }}>{item.product_name}</td>
                        <td><code style={{ background: "#eef2ff", padding: "6px 8px", borderRadius: "6px", color: "#4338ca" }}>{item.product_code}</code></td>
                        <td style={{ fontWeight: "bold", color: item.quantity <= 3 ? "#dc3545" : item.quantity <= 10 ? "#d97706" : "#111827" }}>
                          {item.quantity} {item.quantity <= 3 && <span style={{ fontSize: "0.75rem", color: "#dc3545" }}>Low Stock</span>}
                        </td>
                        <td>
                          <div style={{ color: item.days_until_expiry <= 30 ? "#b45309" : "#374151", fontWeight: item.days_until_expiry <= 30 ? 700 : 500 }}>{item.expiry_date}</div>
                        </td>
                        <td style={{ color: "#475569" }}>{item.aisle_location}</td>
                        <td>
                          <button
                            onClick={() => handleSingleRestock(item.id, item.product_name)}
                            style={{
                              padding: "8px 12px",
                              background: "linear-gradient(135deg, #ef4444, #dc2626)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              boxShadow: "0 8px 15px rgba(239, 68, 68, 0.2)"
                            }}
                          >
                            Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Dynamic Bottom Action Bar in Edit Mode */}
          {isEditMode && (
            <div style={{ marginTop: "15px", padding: "12px 20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #dbeafe", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <span style={{ fontWeight: "bold", color: "#334155" }}>
                {selectedItemIds.length} item(s) selected
              </span>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button 
                  onClick={handleBulkRestock} 
                  disabled={selectedItemIds.length === 0} 
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: selectedItemIds.length === 0 ? "#ccc" : "#0ea5e9", color: "#fff", cursor: selectedItemIds.length === 0 ? "not-allowed" : "pointer", fontWeight: "bold" }}
                >
                  Restock Email
                </button>
                <button 
                  onClick={handleBulkDelete} 
                  disabled={selectedItemIds.length === 0} 
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: selectedItemIds.length === 0 ? "#ccc" : "#dc3545", color: "#fff", cursor: selectedItemIds.length === 0 ? "not-allowed" : "pointer", fontWeight: "bold" }}
                >
                  Delete Selected
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
              Auto-Calculate Distance & Place Order
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
                  <p style={{ color: "green", fontWeight: "bold" }}>Photo Captured</p>
                  <button onClick={() => startCamera("pick")} style={{ ...btnStyle, backgroundColor: "#ffc107" }}>Retake Pick Photo</button>
                </div>
              ) : (
                <button onClick={() => startCamera("pick")} style={btnStyle}>Capture Pick Photo</button>
              )}
            </div>
            <div style={{ ...cameraBoxStyle, borderColor: "#28a745" }}>
              <h4>2. Packed Order Box Photo</h4>
              {packImage ? (
                <div>
                  <p style={{ color: "green", fontWeight: "bold" }}>Photo Captured</p>
                  <button onClick={() => startCamera("pack")} style={{ ...btnStyle, backgroundColor: "#ffc107" }}>Retake Packed Photo</button>
                </div>
              ) : (
                <button onClick={() => startCamera("pack")} style={btnStyle}>Capture Pack Photo</button>
              )}
            </div>
          </div>

          <button onClick={handleAiVerification} style={{ width: "100%", marginTop: "20px", padding: "15px", background: "#0062E6", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer" }}>
            Run AI Verification Match Check
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "18px" }}>
            <h2 style={{ color: "#0062E6", margin: 0 }}>Order Management & AI Priority Pipeline</h2>
            <button
              onClick={handleInventoryInquiry}
              style={{
                padding: "10px 18px",
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 12px 22px rgba(249, 115, 22, 0.25)"
              }}
            >
              Inquiry
            </button>
          </div>

          {showStockOverview && (
            <div style={{ marginBottom: "20px", padding: "18px", borderRadius: "16px", background: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 34%, #eef2ff 100%)", border: "1px solid rgba(96, 165, 250, 0.28)", boxShadow: "0 10px 26px rgba(14, 116, 144, 0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, color: "#0f172a" }}>Inventory Stock Overview</h3>
                <span style={{ fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", borderRadius: "999px", padding: "6px 10px" }}>{inventory.length} items</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                {inventory.map((item) => (
                  <div key={item.id} style={{ background: "rgba(255,255,255,0.92)", borderRadius: "12px", padding: "12px", border: "1px solid rgba(147, 197, 253, 0.5)", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.06)" }}>
                    <div style={{ fontWeight: 700, color: "#1e293b" }}>{item.product_name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "4px" }}>{item.product_code}</div>
                    <div style={{ marginTop: "8px", fontWeight: 700, color: item.quantity <= 5 ? "#dc2626" : "#16a34a" }}>
                      Stock: {item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button onClick={() => handleAdvanceStatus(ord.id, ord.status)} style={{ padding: "6px 12px", background: "#17a2b8", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                        Next Status
                      </button>
                      {ord.status === "DISPATCHED" && (
                        <button onClick={() => handleOpenOtpVerification(ord.id)} style={{ padding: "6px 12px", background: "#22c55e", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                          OTP
                        </button>
                      )}
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
              Send OTP to Customer's Registered Phone
            </button>

            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Enter Customer OTP:</label>
                <input type="text" placeholder="Enter 6-digit OTP" value={inputOtp} onChange={(e) => setInputOtp(e.target.value)} required style={inputModalStyle} />
              </div>
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#28a745", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                Verify OTP & Complete Delivery
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
                  <p style={{ color: "green", fontWeight: "bold" }}>Photo Selected</p>
                  <button type="button" onClick={() => startCamera("damage")} style={{ ...btnStyle, backgroundColor: "#ffc107" }}>Retake Photo</button>
                </div>
              ) : (
                <button type="button" onClick={() => startCamera("damage")} style={btnStyle}>Capture Damage Photo</button>
              )}
            </div>

            <button type="submit" style={{ width: "100%", padding: "12px", background: "#0062E6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
              Assess Damage & Process Refund
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
          <div style={{ background: "#fff", padding: "25px", borderRadius: "14px", width: "440px", maxWidth: "90vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Add New Inventory Item</h3>
              <button
                type="button"
                onClick={() => {
                  stopQrScanner();
                  setShowAddModal(false);
                }}
                style={{ padding: "8px 12px", background: "#6c757d", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                Close
              </button>
            </div>

            <div style={{ marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" onClick={startQrScan} style={{ padding: "10px 14px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 10px 18px rgba(99, 102, 241, 0.25)" }}>
                Scan QR Code
              </button>
              <button type="button" onClick={stopQrScanner} style={{ padding: "10px 14px", background: "#e2e8f0", color: "#0f172a", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                Stop Scanner
              </button>
            </div>

            {isQrScanning && (
              <div style={{ marginBottom: "14px", border: "1px solid #dbeafe", borderRadius: "12px", padding: "10px", background: "linear-gradient(135deg, #f8fafc, #eef2ff)" }}>
                <video id="qr-video" autoPlay playsInline muted style={{ width: "100%", maxHeight: "220px", borderRadius: "8px", background: "#0f172a" }} />
              </div>
            )}

            <div style={{ marginBottom: "14px", padding: "12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", color: "#1e293b" }}>Or paste QR value manually:</label>
              <input
                type="text"
                value={qrManualValue}
                onChange={(e) => setQrManualValue(e.target.value)}
                placeholder="Paste scanned QR data here"
                style={inputModalStyle}
              />
              <button
                type="button"
                onClick={() => {
                  if (!qrManualValue.trim()) return alert("Please paste a QR value first.");
                  handleQrScanSuccess(qrManualValue.trim());
                }}
                style={{ marginTop: "8px", padding: "8px 12px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                Apply QR Value
              </button>
            </div>

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
                <button type="button" onClick={() => {
                  stopQrScanner();
                  setShowAddModal(false);
                }} style={{ padding: "8px 16px", background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", background: "#28a745", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}