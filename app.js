/**
 * Invoice Generator Application Logic
 * Full dynamic state management, live rendering, QR code generation, and PDF export.
 */

// Initial Sample Data (Generic Placeholder)
const initialInvoiceState = {
  sellerName: "ALEX RIVERA",
  sellerAddress: "123 Innovation Way, Suite 400\nTech City, CA 94016",
  sellerEmail: "alex.rivera@example.com",
  sellerPhone: "+1 (555) 019-2834",
  portfolioUrl: "iamsohit.framer.ai",
  qrLabel: "Pay online",
  qrValue: "https://pay.example.com/alexrivera",
  customQrImageData: null,

  clientName: "Acme Global Solutions LLC",
  clientAddress: "742 Evergreen Terrace, Floor 12\nMetropolis, NY 10001",
  clientEmail: "billing@acmeglobal.example",
  clientPhone: "+1 (555) 012-3456",
  

  invoiceNumber: "#INV-00102",
  invoiceDate: "03 Aug 2026",
  currencySymbol: "$",
  currencyCode: "USD",

  items: [
    {
      id: "item-1",
      description: "UI/UX & Presentation Slide Design",
      qty: 10,
      price: 150.00,
      unit: "/Slide",
      gst: 0.00
    }
  ],

  gstTotal: 0.00,
  revisionCharges: 0.00
};

// Application State
let state = JSON.parse(JSON.stringify(initialInvoiceState));
let currentZoom = 1.0;

// DOM Elements Initialization
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind Form Inputs
  bindFormInputs();
  
  // Render Form Items List & Live Preview
  renderFormItems();
  updateLivePreview();

  // Attach Event Listeners
  document.getElementById("add-item-btn").addEventListener("click", handleAddItem);
  document.getElementById("reset-sample-btn").addEventListener("click", handleResetSample);
  document.getElementById("print-btn").addEventListener("click", () => window.print());
  document.getElementById("download-pdf-btn").addEventListener("click", handleDownloadPDF);

  // Custom QR Image Upload listener
  const qrImageUpload = document.getElementById("qr-image-upload");
  const removeQrBtn = document.getElementById("remove-qr-image-btn");

  if (qrImageUpload) {
    qrImageUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          state.customQrImageData = event.target.result;
          if (removeQrBtn) removeQrBtn.style.display = "block";
          updateLivePreview();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removeQrBtn) {
    removeQrBtn.addEventListener("click", () => {
      state.customQrImageData = null;
      if (qrImageUpload) qrImageUpload.value = "";
      removeQrBtn.style.display = "none";
      updateLivePreview();
    });
  }

  // Responsive View Toggle
  const workspace = document.querySelector(".workspace");
  const editorBtn = document.getElementById("view-editor-btn");
  const previewBtn = document.getElementById("view-preview-btn");

  if (editorBtn && previewBtn) {
    editorBtn.addEventListener("click", () => {
      workspace.classList.remove("show-preview-only");
      workspace.classList.add("show-editor-only");
      editorBtn.classList.add("active");
      previewBtn.classList.remove("active");
    });

    previewBtn.addEventListener("click", () => {
      workspace.classList.remove("show-editor-only");
      workspace.classList.add("show-preview-only");
      previewBtn.classList.add("active");
      editorBtn.classList.remove("active");
    });
  }

  // Zoom Controls
  document.getElementById("zoom-in").addEventListener("click", () => setZoom(currentZoom + 0.1));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(currentZoom - 0.1));
  document.getElementById("zoom-reset").addEventListener("click", () => setZoom(1.0));
});

/**
 * Bind DOM Form Inputs with Application State
 */
function bindFormInputs() {
  const inputMap = [
    { id: "seller-name", key: "sellerName" },
    { id: "seller-address", key: "sellerAddress" },
    { id: "seller-email", key: "sellerEmail" },
    { id: "seller-phone", key: "sellerPhone" },
    { id: "portfolio-url", key: "portfolioUrl" },
    { id: "qr-label", key: "qrLabel" },
    { id: "qr-value", key: "qrValue" },
    { id: "client-name", key: "clientName" },
    { id: "client-address", key: "clientAddress" },
    { id: "client-email", key: "clientEmail" },
    { id: "client-phone", key: "clientPhone" },
    { id: "invoice-number", key: "invoiceNumber" },
    { id: "invoice-date", key: "invoiceDate" },
    { id: "currency-symbol", key: "currencySymbol" },
    { id: "currency-code", key: "currencyCode" },
    { id: "gst-amount", key: "gstTotal", isNumber: true },
    { id: "revision-charges", key: "revisionCharges", isNumber: true }
  ];

  inputMap.forEach(({ id, key, isNumber }) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Set initial value
    el.value = state[key] !== undefined ? state[key] : "";

    // Event listener for live updates
    el.addEventListener("input", (e) => {
      state[key] = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
      updateLivePreview();
    });
  });
}

/**
 * Render Item Form Editor Cards in Left Pane
 */
function renderFormItems() {
  const itemsContainer = document.getElementById("items-editor-list");
  itemsContainer.innerHTML = "";

  state.items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-card-header">
        <span class="item-card-title">Item #${index + 1}</span>
        ${state.items.length > 1 ? `
          <button class="icon-btn remove-item-btn" data-id="${item.id}" title="Remove Item" style="color:#ef4444; width:26px; height:26px;">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
          </button>
        ` : ""}
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" class="item-desc" data-id="${item.id}" value="${escapeHtml(item.description)}" placeholder="Service / Item Description">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Qty</label>
          <input type="number" step="1" class="item-qty" data-id="${item.id}" value="${item.qty}">
        </div>
        <div class="form-group">
          <label>Price</label>
          <input type="number" step="0.01" class="item-price" data-id="${item.id}" value="${item.price}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Unit Label</label>
          <input type="text" class="item-unit" data-id="${item.id}" value="${escapeHtml(item.unit || "")}" placeholder="e.g. /Slide or /hr">
        </div>
        <div class="form-group">
          <label>GST</label>
          <input type="number" step="0.01" class="item-gst" data-id="${item.id}" value="${item.gst || 0}">
        </div>
      </div>
    `;

    itemsContainer.appendChild(card);
  });

  // Insert thin dividers between item cards for visual separation
  // (We add them while rendering so they stay in sync with dynamic list)
  state.items.forEach((item, index) => {
    // After each card except the last, insert a divider element
    if (index < state.items.length - 1) {
      const divider = document.createElement('div');
      divider.className = 'item-divider';
      // Find the card at this index (cards were appended in order)
      const cardEl = itemsContainer.querySelectorAll('.item-card')[index];
      if (cardEl && cardEl.nextSibling) {
        // Insert divider right after the card
        itemsContainer.insertBefore(divider, cardEl.nextSibling);
      } else {
        itemsContainer.appendChild(divider);
      }
    }
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Attach Item Event Listeners
  itemsContainer.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const id = e.target.getAttribute("data-id");
      const item = state.items.find((i) => i.id === id);
      if (!item) return;

      if (e.target.classList.contains("item-desc")) item.description = e.target.value;
      if (e.target.classList.contains("item-qty")) item.qty = parseFloat(e.target.value) || 0;
      if (e.target.classList.contains("item-price")) item.price = parseFloat(e.target.value) || 0;
      if (e.target.classList.contains("item-unit")) item.unit = e.target.value;
      if (e.target.classList.contains("item-gst")) item.gst = parseFloat(e.target.value) || 0;

      updateLivePreview();
    });
  });

  itemsContainer.querySelectorAll(".remove-item-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = btn.getAttribute("data-id");
      state.items = state.items.filter((i) => i.id !== id);
      renderFormItems();
      updateLivePreview();
    });
  });
}

/**
 * Add New Item Row
 */
function handleAddItem() {
  const newItem = {
    id: `item-${Date.now()}`,
    description: "New Service Item",
    qty: 1,
    price: 100.00,
    unit: "",
    gst: 0.00
  };
  state.items.push(newItem);
  renderFormItems();
  updateLivePreview();
}

/**
 * Update Live Preview Document DOM
 */
function updateLivePreview() {
  // Update Seller Details
  document.getElementById("doc-seller-name").textContent = state.sellerName || "";
  document.getElementById("doc-seller-address").innerHTML = (state.sellerAddress || "").replace(/\n/g, "<br>");
  document.getElementById("doc-seller-email").textContent = state.sellerEmail || "";

  const sellerPhoneEl = document.getElementById("doc-seller-phone");
  if (sellerPhoneEl) {
    sellerPhoneEl.textContent = state.sellerPhone || "";
  }

  // Update Footer Portfolio Hyperlink
  const portfolioLink = document.getElementById("doc-portfolio-link");
  const portfolioContainer = document.getElementById("doc-footer-portfolio");
  if (portfolioLink && portfolioContainer) {
    const rawUrl = (state.portfolioUrl || "").trim();
    if (rawUrl) {
      portfolioContainer.style.display = "block";
      portfolioLink.textContent = rawUrl;
      portfolioLink.href = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;
    } else {
      portfolioContainer.style.display = "none";
    }
  }

  // Update QR Code Label & QR Matrix
  document.getElementById("doc-qr-label").textContent = state.qrLabel || "Pay online";
  renderQRCode(state.qrValue || "connect.sohit@gmail.com");

  // Update Title Meta
  document.getElementById("doc-invoice-number").textContent = state.invoiceNumber || "";

  // Update Client Details
  document.getElementById("doc-client-name").textContent = state.clientName || "";
  document.getElementById("doc-client-address").innerHTML = (state.clientAddress || "").replace(/\n/g, "<br>");
  document.getElementById("doc-client-email").textContent = state.clientEmail || "";
  document.getElementById("doc-client-phone").textContent = state.clientPhone || "";

  // Update Invoice Date
  document.getElementById("doc-invoice-date").textContent = state.invoiceDate || "";

  // Render Items Table Rows
  const tbody = document.getElementById("doc-items-body");
  tbody.innerHTML = "";

  let subtotal = 0;

  state.items.forEach((item) => {
    const rowAmount = item.qty * item.price;
    subtotal += rowAmount;

    const tr = document.createElement("tr");
    
    // Format price column with unit e.g., "200.00/Slide"
    const formattedPrice = `${formatNumber(item.price)}${item.unit || ""}`;
    const formattedAmount = formatNumber(rowAmount);
    const formattedGst = formatNumber(item.gst || 0);

    tr.innerHTML = `
      <td class="col-desc">${escapeHtml(item.description)}</td>
      <td class="col-qty">${item.qty}</td>
      <td class="col-price">${formattedPrice}</td>
      <td class="col-gst">${formattedGst}</td>
      <td class="col-amount">${formattedAmount}</td>
    `;
    tbody.appendChild(tr);
  });

  // Calculate Totals
  const symbol = state.currencySymbol || "₹";
  const code = state.currencyCode || "INR";
  const gstTotal = state.gstTotal !== undefined && state.gstTotal !== 0 ? state.gstTotal : state.items.reduce((sum, item) => sum + (item.gst || 0), 0);
  const revision = state.revisionCharges || 0;
  const grandTotal = subtotal + gstTotal + revision;

  document.getElementById("doc-subtotal").textContent = `${symbol}${formatNumber(subtotal)}`;
  document.getElementById("doc-gst").textContent = `${symbol}${formatNumber(gstTotal)}`;
  document.getElementById("doc-revision").textContent = `${symbol}${formatNumber(revision)}`;
  document.getElementById("doc-grand-total").textContent = `${formatNumber(grandTotal)} ${code}`;
}

/**
 * Render Dynamic QR Code inside the Document
 */
function renderQRCode(text) {
  const qrBox = document.getElementById("doc-qr-code");
  qrBox.innerHTML = "";

  // If user uploaded a custom QR code image file
  if (state.customQrImageData) {
    qrBox.innerHTML = `<img src="${state.customQrImageData}" alt="Custom QR Code" style="width:100%; height:100%; object-fit:contain; border-radius:2px;">`;
    return;
  }

  if (window.QRCode && text.trim() !== "") {
    new QRCode(qrBox, {
      text: text,
      width: 100,
      height: 100,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    // Canvas SVG Fallback QR render
    qrBox.innerHTML = `
      <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white"/>
        <path d="M10 10H40V40H10V10ZM20 20V30H30V20H20Z" fill="black"/>
        <path d="M60 10H90V40H60V10ZM70 20V30H80V20H70Z" fill="black"/>
        <path d="M10 60H40V90H10V60ZM20 70V80H30V70H20Z" fill="black"/>
        <rect x="50" y="50" width="10" height="10" fill="black"/>
        <rect x="70" y="50" width="20" height="10" fill="black"/>
        <rect x="50" y="70" width="20" height="20" fill="black"/>
        <rect x="80" y="80" width="10" height="10" fill="black"/>
      </svg>
    `;
  }
}

/**
 * Handle Download PDF using html2pdf.js
 */
function handleDownloadPDF() {
  const element = document.getElementById("invoice-document");
  const filename = `Invoice_${(state.invoiceNumber || "00000").replace(/[^a-zA-Z0-9]/g, "")}.pdf`;

  // Temporary zoom reset for pristine capture
  const prevZoom = currentZoom;
  setZoom(1.0);

  const opt = {
    margin: 0,
    filename: filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#111111"
    },
    jsPDF: {
      unit: "pt",
      format: "a4",
      orientation: "portrait"
    }
  };

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(element).save().then(() => {
      setZoom(prevZoom);
    });
  } else {
    // Print fallback if library fails to load
    window.print();
    setZoom(prevZoom);
  }
}

/**
 * Reset Form to Sample PDF State
 */
function handleResetSample() {
  state = JSON.parse(JSON.stringify(initialInvoiceState));
  bindFormInputs();
  renderFormItems();
  updateLivePreview();
}

/**
 * Zoom Control Function
 */
function setZoom(level) {
  currentZoom = Math.max(0.5, Math.min(1.5, level));
  const doc = document.getElementById("invoice-document");
  doc.style.transform = `scale(${currentZoom})`;
  document.getElementById("zoom-level").textContent = `${Math.round(currentZoom * 100)}%`;
}

/**
 * Utility: Format Numbers with 2 decimals and commas (e.g. 2,600.00)
 */
function formatNumber(num) {
  const val = typeof num === "number" ? num : parseFloat(num) || 0;
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Utility: Escape HTML text to prevent injection
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
