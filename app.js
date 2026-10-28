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
  paymentMode: "qr",
  bankPayeeName: "",
  bankAccountNumber: "",
  bankIFSC: "",

  clientName: "Acme Global Solutions LLC",
  clientAddress: "742 Evergreen Terrace, Floor 12\nMetropolis, NY 10001",
  clientEmail: "billing@acmeglobal.example",
  clientPhone: "+1 (555) 012-3456",

  invoiceNumber: "#INV-00102",
  invoiceDate: "2026-08-03",
  currency: "USD",
  invoiceColorMode: "dark",

  items: [
    {
      id: "item-1",
      description: "UI/UX & Presentation Slide Design",
      qty: 10,
      price: 150.00,
      unit: "/Slide"
    }
  ],

  gstRate: 0.00,
  revisionCharges: 0.00,
  revisionChargesLabel: "Charges",
  discountAmount: 0.00,
  discountType: "amount",
  revisionEnabled: true,
  discountEnabled: true
};

// Application State
let state = JSON.parse(JSON.stringify(initialInvoiceState));
let currentZoom = 1.0;
const COMPANY_PROFILES_STORAGE_KEY = "invoice-generator-company-profiles";
const CLIENT_PROFILES_STORAGE_KEY = "invoice-generator-client-profiles";
const INVOICE_HISTORY_STORAGE_KEY = "invoice-generator-invoice-history";
let companyProfiles = [];
let clientProfiles = [];
let invoiceHistory = [];
let invoiceHistoryAvailable = true;
let companyQrImageData = null;
let isInvoiceGenerating = false;
let settingsDrawerCloseTimer = null;

// DOM Elements Initialization
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  loadCompanyProfiles();
  renderCompanyProfiles();
  loadClientProfiles();
  renderClientProfiles();
  loadInvoiceHistory();
  renderInvoiceHistory();

  // Bind Form Inputs
  bindFormInputs();
  updateDiscountInputLabel();
  validateInvoiceNumber();
  updatePaymentFieldsVisibility();
  updateChargeFieldsVisibility();
  
  // Render Form Items List & Live Preview
  renderFormItems();
  updateLivePreview();

  // Attach Event Listeners
  document.getElementById("add-item-btn").addEventListener("click", handleAddItem);
  document.getElementById("reset-sample-btn").addEventListener("click", handleResetSample);
  document.getElementById("print-btn").addEventListener("click", handlePrintInvoice);
  document.getElementById("download-pdf-btn").addEventListener("click", handleDownloadPDF);
  document.getElementById("company-settings-btn").addEventListener("click", openCompanySettings);
  const settingsDialog = document.getElementById("company-settings-dialog");
  document.getElementById("close-company-settings-btn").addEventListener("click", closeCompanySettings);
  settingsDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCompanySettings();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && settingsDialog.open) {
      event.preventDefault();
      closeCompanySettings();
    }
  });
  settingsDialog.addEventListener("click", (event) => {
    if (event.target === settingsDialog) closeCompanySettings();
  });
  settingsDialog.addEventListener("close", () => {
    settingsDialog.classList.remove("closing");
    window.clearTimeout(settingsDrawerCloseTimer);
    settingsDrawerCloseTimer = null;
  });
  document.getElementById("add-company-btn").addEventListener("click", resetCompanyForm);
  document.getElementById("cancel-company-edit-btn").addEventListener("click", resetCompanyForm);
  document.getElementById("company-profile-form").addEventListener("submit", handleSaveCompany);
  document.getElementById("company-payment-mode").addEventListener("change", updateCompanyPaymentFieldsVisibility);
  document.getElementById("company-profiles-list").addEventListener("click", handleCompanyListAction);
  document.getElementById("company-profile").addEventListener("change", handleCompanySelection);
  document.getElementById("company-qr-image").addEventListener("change", handleCompanyQrImageChange);
  document.getElementById("remove-company-qr-btn").addEventListener("click", removeCompanyQrImage);
  document.getElementById("add-client-btn").addEventListener("click", resetClientForm);
  document.getElementById("cancel-client-edit-btn").addEventListener("click", resetClientForm);
  document.getElementById("client-profile-form").addEventListener("submit", handleSaveClient);
  document.getElementById("client-profiles-list").addEventListener("click", handleClientListAction);
  document.getElementById("client-profile").addEventListener("change", handleClientSelection);
  document.querySelectorAll(".settings-tab").forEach((tab) => {
    tab.addEventListener("click", () => activateSettingsTab(tab));
  });
  document.getElementById("revision-enabled").addEventListener("change", (event) => {
    state.revisionEnabled = event.target.checked;
    updateChargeFieldsVisibility();
    updateLivePreview();
  });
  document.getElementById("discount-enabled").addEventListener("change", (event) => {
    state.discountEnabled = event.target.checked;
    updateChargeFieldsVisibility();
    updateLivePreview();
  });
  document.getElementById("discount-type").addEventListener("change", (event) => {
    state.discountType = event.target.value;
    updateDiscountInputLabel();
    updateLivePreview();
  });

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
const FORM_INPUTS = [
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
    { id: "revision-charges-label", key: "revisionChargesLabel" },
    { id: "discount-amount", key: "discountAmount", isNumber: true },
    { id: "discount-type", key: "discountType" },
    { id: "invoice-number", key: "invoiceNumber" },
    { id: "invoice-date", key: "invoiceDate" },
    { id: "currency", key: "currency" },
    { id: "invoice-color-mode", key: "invoiceColorMode" },
    { id: "payment-mode", key: "paymentMode" },
    { id: "bank-payee-name", key: "bankPayeeName" },
    { id: "bank-account-number", key: "bankAccountNumber" },
    { id: "bank-ifsc", key: "bankIFSC" },
    { id: "gst-rate", key: "gstRate", isNumber: true },
    { id: "revision-charges", key: "revisionCharges", isNumber: true }
];

function bindFormInputs() {
  syncFormInputs();

  FORM_INPUTS.forEach(({ id, key, isNumber }) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Event listener for live updates
    const updateState = (e) => {
      state[key] = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
      if (key === "invoiceNumber") validateInvoiceNumber();
      if (key === "paymentMode") {
        updatePaymentFieldsVisibility();
      }
      if (["sellerName", "sellerAddress", "sellerEmail", "sellerPhone", "qrLabel", "qrValue", "paymentMode", "bankPayeeName", "bankAccountNumber", "bankIFSC"].includes(key)) {
        document.getElementById("company-profile").value = "";
        updateCompanyNameVisibility();
      }
      if (["clientName", "clientAddress", "clientEmail", "clientPhone"].includes(key)) {
        document.getElementById("client-profile").value = "";
        updateClientNameVisibility();
      }
      updateLivePreview();
    };

    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", updateState);
  });
}

/**
 * Copy current state values into the form inputs (no listeners attached)
 */
function syncFormInputs() {
  FORM_INPUTS.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) el.value = state[key] !== undefined ? state[key] : "";
  });
}

function loadCompanyProfiles() {
  try {
    const storedProfiles = localStorage.getItem(COMPANY_PROFILES_STORAGE_KEY);
    if (!storedProfiles) return;

    const parsedProfiles = JSON.parse(storedProfiles);
    const profileFields = [
      "sellerAddress", "sellerEmail", "sellerPhone", "qrLabel", "qrValue",
      "bankPayeeName", "bankAccountNumber", "bankIFSC"
    ];
    if (!Array.isArray(parsedProfiles) || parsedProfiles.some((profile) =>
      !profile ||
      typeof profile.id !== "string" ||
      typeof profile.sellerName !== "string" ||
      profileFields.some((field) => typeof profile[field] !== "string") ||
      !["qr", "bank"].includes(profile.paymentMode) ||
      (profile.customQrImageData !== null && typeof profile.customQrImageData !== "string")
    )) {
      throw new Error("Saved company profile data has an invalid format.");
    }
    companyProfiles = parsedProfiles;
  } catch (error) {
    console.error("Unable to load saved company profiles.", error);
    window.alert("Saved company profiles could not be loaded. You can still continue using the invoice generator.");
  }
}

function persistCompanyProfiles(profiles) {
  try {
    localStorage.setItem(COMPANY_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    companyProfiles = profiles;
    renderCompanyProfiles();
    return true;
  } catch (error) {
    console.error("Unable to save company profiles.", error);
    setCompanySettingsStatus("Could not save company profiles in this browser. Check available browser storage and try again.", true);
    return false;
  }
}

function renderCompanyProfiles() {
  const selector = document.getElementById("company-profile");
  const selectedId = selector.value;
  selector.replaceChildren(new Option("Manual entry", ""));

  companyProfiles.forEach((profile) => {
    selector.add(new Option(profile.sellerName, profile.id));
  });
  selector.value = companyProfiles.some((profile) => profile.id === selectedId) ? selectedId : "";
  updateCompanyNameVisibility();

  const list = document.getElementById("company-profiles-list");
  list.replaceChildren();
  if (companyProfiles.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-company-list";
    emptyState.textContent = "No sellers saved yet. Add a seller to reuse invoice and payment details.";
    list.appendChild(emptyState);
    return;
  }

  companyProfiles.forEach((profile) => {
    const row = document.createElement("div");
    row.className = "company-profile-row";
    const name = document.createElement("span");
    name.className = "company-profile-name";
    name.textContent = profile.sellerName;
    const actions = document.createElement("div");
    actions.className = "company-profile-actions";
    ["Edit", "Delete"].forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = label === "Delete" ? "btn btn-danger" : "btn btn-secondary";
      button.dataset.action = label.toLowerCase();
      button.dataset.profileId = profile.id;
      button.textContent = label;
      actions.appendChild(button);
    });
    row.append(name, actions);
    list.appendChild(row);
  });
}

function loadClientProfiles() {
  try {
    const storedProfiles = localStorage.getItem(CLIENT_PROFILES_STORAGE_KEY);
    if (!storedProfiles) return;

    const parsedProfiles = JSON.parse(storedProfiles);
    const profileFields = ["clientName", "clientAddress", "clientEmail", "clientPhone"];
    if (!Array.isArray(parsedProfiles) || parsedProfiles.some((profile) =>
      !profile ||
      typeof profile.id !== "string" ||
      profileFields.some((field) => typeof profile[field] !== "string")
    )) {
      throw new Error("Saved client profile data has an invalid format.");
    }
    clientProfiles = parsedProfiles;
  } catch (error) {
    console.error("Unable to load saved client profiles.", error);
    window.alert("Saved client profiles could not be loaded. You can still continue using the invoice generator.");
  }
}

function persistClientProfiles(profiles) {
  try {
    localStorage.setItem(CLIENT_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    clientProfiles = profiles;
    renderClientProfiles();
    return true;
  } catch (error) {
    console.error("Unable to save client profiles.", error);
    setClientSettingsStatus("Could not save client profiles in this browser. Check available browser storage and try again.", true);
    return false;
  }
}

function renderClientProfiles() {
  const selector = document.getElementById("client-profile");
  const selectedId = selector.value;
  selector.replaceChildren(new Option("Manual entry", ""));
  clientProfiles.forEach((profile) => {
    selector.add(new Option(profile.clientName, profile.id));
  });
  selector.value = clientProfiles.some((profile) => profile.id === selectedId) ? selectedId : "";
  updateClientNameVisibility();

  const list = document.getElementById("client-profiles-list");
  list.replaceChildren();
  if (clientProfiles.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-company-list";
    emptyState.textContent = "No clients saved yet. Add a client to reuse its billing details.";
    list.appendChild(emptyState);
    return;
  }

  clientProfiles.forEach((profile) => {
    const row = document.createElement("div");
    row.className = "company-profile-row";
    const name = document.createElement("span");
    name.className = "company-profile-name";
    name.textContent = profile.clientName;
    const actions = document.createElement("div");
    actions.className = "company-profile-actions";
    ["Edit", "Delete"].forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = label === "Delete" ? "btn btn-danger" : "btn btn-secondary";
      button.dataset.action = label.toLowerCase();
      button.dataset.profileId = profile.id;
      button.textContent = label;
      actions.appendChild(button);
    });
    row.append(name, actions);
    list.appendChild(row);
  });
}

function resetClientForm() {
  document.getElementById("client-profile-form").reset();
  document.getElementById("client-edit-id").value = "";
  document.getElementById("client-form-title").textContent = "Add a client";
  setClientSettingsStatus("");
}

function handleClientListAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const profile = clientProfiles.find((item) => item.id === button.dataset.profileId);
  if (!profile) return;

  if (button.dataset.action === "edit") {
    document.getElementById("client-edit-id").value = profile.id;
    document.getElementById("client-form-title").textContent = "Edit client";
    document.getElementById("saved-client-name").value = profile.clientName;
    document.getElementById("saved-client-address").value = profile.clientAddress;
    document.getElementById("saved-client-email").value = profile.clientEmail;
    document.getElementById("saved-client-phone").value = profile.clientPhone;
    setClientSettingsStatus("");
    document.getElementById("saved-client-name").focus();
    return;
  }

  if (button.dataset.action === "delete" && window.confirm(`Delete the saved client "${profile.clientName}"?`)) {
    const saved = persistClientProfiles(clientProfiles.filter((item) => item.id !== profile.id));
    if (!saved) return;
    if (document.getElementById("client-profile").value === profile.id) {
      document.getElementById("client-profile").value = "";
      updateClientNameVisibility();
    }
    if (document.getElementById("client-edit-id").value === profile.id) resetClientForm();
  }
}

function handleSaveClient(event) {
  event.preventDefault();
  const name = document.getElementById("saved-client-name").value.trim();
  if (!name) {
    setClientSettingsStatus("Enter a company or client name.", true);
    return;
  }

  const editId = document.getElementById("client-edit-id").value;
  const profile = {
    id: editId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    clientName: name,
    clientAddress: document.getElementById("saved-client-address").value,
    clientEmail: document.getElementById("saved-client-email").value,
    clientPhone: document.getElementById("saved-client-phone").value
  };
  const profiles = clientProfiles.some((item) => item.id === editId)
    ? clientProfiles.map((item) => item.id === editId ? profile : item)
    : [...clientProfiles, profile];

  if (!persistClientProfiles(profiles)) return;
  document.getElementById("client-profile").value = profile.id;
  updateClientNameVisibility();
  applyClientProfile(profile);
  resetClientForm();
  setClientSettingsStatus(`Saved "${profile.clientName}". Select it from Saved Client to use it on an invoice.`);
}

function handleClientSelection(event) {
  const profile = clientProfiles.find((item) => item.id === event.target.value);
  updateClientNameVisibility();
  if (profile) applyClientProfile(profile);
}

function updateClientNameVisibility() {
  const nameInput = document.getElementById("client-name");
  nameInput.hidden = false;
  nameInput.removeAttribute("aria-hidden");
}

function applyClientProfile(profile) {
  const profileState = {
    clientName: profile.clientName,
    clientAddress: profile.clientAddress,
    clientEmail: profile.clientEmail,
    clientPhone: profile.clientPhone
  };
  Object.assign(state, profileState);
  Object.entries({
    "client-name": "clientName",
    "client-address": "clientAddress",
    "client-email": "clientEmail",
    "client-phone": "clientPhone"
  }).forEach(([id, key]) => {
    document.getElementById(id).value = state[key] || "";
  });
  updateLivePreview();
}

function setClientSettingsStatus(message, isError = false) {
  const status = document.getElementById("client-settings-status");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function loadInvoiceHistory() {
  try {
    const storedHistory = localStorage.getItem(INVOICE_HISTORY_STORAGE_KEY);
    if (!storedHistory) return;

    const parsedHistory = JSON.parse(storedHistory);
    if (!Array.isArray(parsedHistory) || parsedHistory.some((entry) =>
      !entry ||
      typeof entry.invoiceNumber !== "string" ||
      typeof entry.normalizedInvoiceNumber !== "string" ||
      entry.normalizedInvoiceNumber !== normalizeInvoiceNumber(entry.invoiceNumber) ||
      typeof entry.generatedAt !== "string" ||
      !Number.isFinite(Date.parse(entry.generatedAt)) ||
      typeof entry.clientName !== "string" ||
      typeof entry.total !== "number" ||
      !Number.isFinite(entry.total) ||
      !["INR", "USD"].includes(entry.currency)
    )) {
      throw new Error("Saved invoice history has an invalid format.");
    }
    invoiceHistory = parsedHistory;
  } catch (error) {
    invoiceHistoryAvailable = false;
    console.error("Unable to load invoice history.", error);
    window.alert("Invoice history could not be loaded. Invoice generation is disabled to prevent duplicate invoice numbers.");
  }
}

function persistInvoiceHistory(history) {
  try {
    localStorage.setItem(INVOICE_HISTORY_STORAGE_KEY, JSON.stringify(history));
    invoiceHistory = history;
    invoiceHistoryAvailable = true;
    renderInvoiceHistory();
    return true;
  } catch (error) {
    console.error("Unable to save invoice history.", error);
    setInvoiceNumberStatus("Invoice history could not be saved. Invoice generation is disabled until browser storage is available.", true);
    return false;
  }
}

function renderInvoiceHistory() {
  const list = document.getElementById("invoice-history-list");
  if (!list) return;
  list.replaceChildren();

  const status = document.getElementById("invoice-history-status");
  status.textContent = invoiceHistoryAvailable ? "" : "History is unavailable; invoice generation is blocked to prevent duplicate numbers.";
  status.classList.toggle("error", !invoiceHistoryAvailable);

  if (invoiceHistory.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-company-list";
    emptyState.textContent = "No invoices generated yet.";
    list.appendChild(emptyState);
    return;
  }

  [...invoiceHistory].reverse().forEach((entry) => {
    const row = document.createElement("div");
    row.className = "invoice-history-row";
    const details = document.createElement("div");
    details.className = "invoice-history-details";
    const number = document.createElement("strong");
    number.textContent = entry.invoiceNumber;
    const client = document.createElement("span");
    client.textContent = entry.clientName || "No client";
    const date = document.createElement("time");
    date.dateTime = entry.generatedAt;
    date.textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(entry.generatedAt));
    const total = document.createElement("strong");
    total.textContent = `${formatNumber(entry.total)} ${entry.currency}`;
    details.append(number, client, date);
    row.append(details, total);
    list.appendChild(row);
  });
}

function normalizeInvoiceNumber(value) {
  return value.trim().toLocaleLowerCase();
}

function validateInvoiceNumber() {
  const input = document.getElementById("invoice-number");
  const normalizedNumber = normalizeInvoiceNumber(input.value);
  let message = "";

  if (!normalizedNumber) {
    message = "Enter an invoice number before generating an invoice.";
  } else if (invoiceHistory.some((entry) => entry.normalizedInvoiceNumber === normalizedNumber)) {
    message = `Invoice number "${input.value.trim()}" has already been used. Enter a unique invoice number.`;
  } else if (!invoiceHistoryAvailable) {
    message = "Invoice history is unavailable, so invoice generation is blocked.";
  }

  input.setCustomValidity(message);
  setInvoiceNumberStatus(message, Boolean(message));
  return !message;
}

function setInvoiceNumberStatus(message, isError = false) {
  const status = document.getElementById("invoice-number-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function createInvoiceHistoryEntry() {
  const subtotal = state.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const gst = subtotal * (state.gstRate || 0) / 100;
  const charges = state.revisionEnabled === false ? 0 : state.revisionCharges || 0;
  const discount = calculateDiscountAmount(subtotal);
  const currency = state.currency === "INR" ? "INR" : "USD";

  return {
    invoiceNumber: state.invoiceNumber.trim(),
    normalizedInvoiceNumber: normalizeInvoiceNumber(state.invoiceNumber),
    generatedAt: new Date().toISOString(),
    clientName: state.clientName || "",
    total: subtotal + gst + charges - discount,
    currency
  };
}

function handlePrintInvoice() {
  if (!validateInvoiceNumber()) {
    document.getElementById("invoice-number").reportValidity();
    return;
  }
  if (isInvoiceGenerating) return;

  const entry = createInvoiceHistoryEntry();
  if (!persistInvoiceHistory([...invoiceHistory, entry])) return;
  window.print();
}

function openCompanySettings() {
  const dialog = document.getElementById("company-settings-dialog");
  window.clearTimeout(settingsDrawerCloseTimer);
  settingsDrawerCloseTimer = null;
  dialog.classList.remove("closing");
  setCompanySettingsStatus("");
  activateSettingsTab(document.getElementById("seller-settings-tab"));
  if (!dialog.open) dialog.showModal();
}

function closeCompanySettings() {
  const dialog = document.getElementById("company-settings-dialog");
  if (!dialog.open || dialog.classList.contains("closing")) return;

  dialog.classList.add("closing");
  const finishClosing = () => {
    settingsDrawerCloseTimer = null;
    if (dialog.open) dialog.close();
  };
  settingsDrawerCloseTimer = window.setTimeout(finishClosing, 300);
}

function activateSettingsTab(activeTab) {
  document.querySelectorAll(".settings-tab").forEach((tab) => {
    const isActive = tab === activeTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll(".settings-panel").forEach((panel) => {
    panel.hidden = panel.id !== activeTab.getAttribute("aria-controls");
  });
}

function resetCompanyForm() {
  const form = document.getElementById("company-profile-form");
  form.reset();
  document.getElementById("company-edit-id").value = "";
  document.getElementById("company-form-title").textContent = "Add a seller";
  document.getElementById("company-qr-image").value = "";
  companyQrImageData = null;
  document.getElementById("remove-company-qr-btn").hidden = true;
  updateCompanyPaymentFieldsVisibility();
  setCompanySettingsStatus("");
}

function updateCompanyPaymentFieldsVisibility() {
  const showBank = document.getElementById("company-payment-mode").value === "bank";
  document.querySelectorAll(".company-bank-field").forEach((field) => {
    field.hidden = !showBank;
  });
  document.querySelectorAll(".company-qr-field").forEach((field) => {
    field.hidden = showBank;
  });
}

function handleCompanyQrImageChange(event) {
  const file = event.target.files[0];
  if (!file) {
    companyQrImageData = null;
    return;
  }
  if (!file.type.startsWith("image/")) {
    setCompanySettingsStatus("Choose a valid image file for the custom QR code.", true);
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string") {
      setCompanySettingsStatus("The selected QR image could not be read.", true);
      return;
    }
    companyQrImageData = reader.result;
    document.getElementById("remove-company-qr-btn").hidden = false;
    setCompanySettingsStatus("");
  };
  reader.onerror = () => {
    setCompanySettingsStatus("The selected QR image could not be read.", true);
  };
  reader.readAsDataURL(file);
}

function removeCompanyQrImage() {
  companyQrImageData = null;
  document.getElementById("company-qr-image").value = "";
  document.getElementById("remove-company-qr-btn").hidden = true;
}

function handleCompanyListAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const profile = companyProfiles.find((item) => item.id === button.dataset.profileId);
  if (!profile) return;

  if (button.dataset.action === "edit") {
    document.getElementById("company-edit-id").value = profile.id;
    document.getElementById("company-form-title").textContent = "Edit seller";
    document.getElementById("company-name").value = profile.sellerName;
    document.getElementById("company-address").value = profile.sellerAddress;
    document.getElementById("company-email").value = profile.sellerEmail;
    document.getElementById("company-phone").value = profile.sellerPhone;
    document.getElementById("company-payment-label").value = profile.qrLabel;
    document.getElementById("company-payment-mode").value = profile.paymentMode;
    document.getElementById("company-qr-value").value = profile.qrValue;
    document.getElementById("company-bank-payee-name").value = profile.bankPayeeName;
    document.getElementById("company-bank-account-number").value = profile.bankAccountNumber;
    document.getElementById("company-bank-ifsc").value = profile.bankIFSC;
    document.getElementById("company-qr-image").value = "";
    companyQrImageData = profile.customQrImageData || null;
    document.getElementById("remove-company-qr-btn").hidden = !companyQrImageData;
    updateCompanyPaymentFieldsVisibility();
    setCompanySettingsStatus("");
    document.getElementById("company-name").focus();
    return;
  }

  if (button.dataset.action === "delete" && window.confirm(`Delete the saved profile for "${profile.sellerName}"?`)) {
    const saved = persistCompanyProfiles(companyProfiles.filter((item) => item.id !== profile.id));
    if (!saved) return;
    if (document.getElementById("company-profile").value === profile.id) {
      document.getElementById("company-profile").value = "";
      updateCompanyNameVisibility();
    }
    if (document.getElementById("company-edit-id").value === profile.id) resetCompanyForm();
  }
}

function handleSaveCompany(event) {
  event.preventDefault();
  const name = document.getElementById("company-name").value.trim();
  if (!name) {
    setCompanySettingsStatus("Enter a seller or organization name.", true);
    return;
  }
  if (document.getElementById("company-qr-image").files.length && !companyQrImageData) {
    setCompanySettingsStatus("Wait for the QR image to finish loading, then save again.", true);
    return;
  }

  const editId = document.getElementById("company-edit-id").value;
  const existingProfile = companyProfiles.find((profile) => profile.id === editId);
  const profile = {
    id: editId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sellerName: name,
    sellerAddress: document.getElementById("company-address").value,
    sellerEmail: document.getElementById("company-email").value,
    sellerPhone: document.getElementById("company-phone").value,
    qrLabel: document.getElementById("company-payment-label").value,
    paymentMode: document.getElementById("company-payment-mode").value,
    qrValue: document.getElementById("company-qr-value").value,
    customQrImageData: companyQrImageData,
    bankPayeeName: document.getElementById("company-bank-payee-name").value,
    bankAccountNumber: document.getElementById("company-bank-account-number").value,
    bankIFSC: document.getElementById("company-bank-ifsc").value
  };
  const profiles = existingProfile
    ? companyProfiles.map((item) => item.id === editId ? profile : item)
    : [...companyProfiles, profile];

  if (!persistCompanyProfiles(profiles)) return;
  document.getElementById("company-profile").value = profile.id;
  updateCompanyNameVisibility();
  applyCompanyProfile(profile);
  resetCompanyForm();
  setCompanySettingsStatus(`Saved "${profile.sellerName}". Select it from Full Name / Organization to use it on an invoice.`);
}

function handleCompanySelection(event) {
  const profile = companyProfiles.find((item) => item.id === event.target.value);
  updateCompanyNameVisibility();
  if (!profile) return;
  applyCompanyProfile(profile);
}

function updateCompanyNameVisibility() {
  const nameInput = document.getElementById("seller-name");
  nameInput.hidden = false;
  nameInput.removeAttribute("aria-hidden");
}

function applyCompanyProfile(profile) {
  const profileState = {
    sellerName: profile.sellerName,
    sellerAddress: profile.sellerAddress,
    sellerEmail: profile.sellerEmail,
    sellerPhone: profile.sellerPhone,
    qrLabel: profile.qrLabel,
    paymentMode: profile.paymentMode,
    qrValue: profile.qrValue,
    customQrImageData: profile.customQrImageData,
    bankPayeeName: profile.bankPayeeName,
    bankAccountNumber: profile.bankAccountNumber,
    bankIFSC: profile.bankIFSC
  };
  Object.assign(state, profileState);
  Object.entries({
    "seller-name": "sellerName",
    "seller-address": "sellerAddress",
    "seller-email": "sellerEmail",
    "seller-phone": "sellerPhone",
    "qr-label": "qrLabel",
    "payment-mode": "paymentMode",
    "qr-value": "qrValue",
    "bank-payee-name": "bankPayeeName",
    "bank-account-number": "bankAccountNumber",
    "bank-ifsc": "bankIFSC"
  }).forEach(([id, key]) => {
    document.getElementById(id).value = state[key] || "";
  });
  document.getElementById("qr-image-upload").value = "";
  document.getElementById("remove-qr-image-btn").style.display = state.customQrImageData ? "block" : "none";
  updatePaymentFieldsVisibility();
  updateLivePreview();
}

function setCompanySettingsStatus(message, isError = false) {
  const status = document.getElementById("company-settings-status");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function updatePaymentFieldsVisibility() {
  const showBank = state.paymentMode === "bank";
  document.querySelectorAll(".bank-details-group").forEach((group) => {
    group.style.display = showBank ? "flex" : "none";
  });
  document.querySelectorAll(".qr-only-group").forEach((group) => {
    group.style.display = showBank ? "none" : "flex";
  });
}

function updateChargeFieldsVisibility() {
  const revisionEnabled = state.revisionEnabled !== false;
  const discountEnabled = state.discountEnabled !== false;
  document.getElementById("revision-enabled").checked = revisionEnabled;
  document.getElementById("discount-enabled").checked = discountEnabled;
  document.getElementById("revision-fields").hidden = !revisionEnabled;
  document.getElementById("discount-fields").hidden = !discountEnabled;
}

function updateDiscountInputLabel() {
  const isPercentage = state.discountType === "percentage";
  document.getElementById("discount-amount-label").textContent = isPercentage
    ? "Discount Percentage (%)"
    : "Discount Amount";
  document.getElementById("discount-amount").placeholder = isPercentage ? "0" : "0.00";
}

function calculateDiscountAmount(subtotal) {
  if (state.discountEnabled === false) return 0;
  const value = Math.max(0, state.discountAmount || 0);
  return state.discountType === "percentage" ? subtotal * value / 100 : value;
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
      <div class="form-group">
        <label>Unit Label</label>
        <input type="text" class="item-unit" data-id="${item.id}" value="${escapeHtml(item.unit || "")}" placeholder="e.g. /Slide or /hr">
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
  const invoiceDocument = document.getElementById("invoice-document");
  invoiceDocument.classList.toggle("light-theme", state.invoiceColorMode === "light");
  invoiceDocument.classList.toggle("dark-theme", state.invoiceColorMode !== "light");

  // Update Seller Details
  document.getElementById("doc-seller-name").textContent = state.sellerName || "";
  document.getElementById("doc-seller-address").innerHTML = escapeHtml(state.sellerAddress).replace(/\n/g, "<br>");
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
      portfolioContainer.style.display = "flex";
      portfolioLink.hidden = false;
      portfolioLink.textContent = rawUrl;
      portfolioLink.href = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;
    } else {
      portfolioContainer.style.display = "flex";
      portfolioLink.hidden = true;
    }
  }

  // Update QR or Bank Payment Details
  const qrLabelEl = document.getElementById("doc-qr-label");
  const bankDetailsEl = document.getElementById("doc-bank-details");
  const qrContainerEl = document.getElementById("doc-qr-code");
  qrLabelEl.textContent = state.qrLabel || "Pay online";

  if (state.paymentMode === "bank") {
    qrContainerEl.style.display = "none";
    if (bankDetailsEl) {
      const bankHtml = [];
      if (state.bankPayeeName) bankHtml.push(`<div><strong>Payee Name:</strong> ${escapeHtml(state.bankPayeeName)}</div>`);
      if (state.bankAccountNumber) bankHtml.push(`<div><strong>Account No.:</strong> ${escapeHtml(state.bankAccountNumber)}</div>`);
      if (state.bankIFSC) bankHtml.push(`<div><strong>IFSC:</strong> ${escapeHtml(state.bankIFSC)}</div>`);
      bankDetailsEl.style.display = bankHtml.length ? "block" : "none";
      bankDetailsEl.innerHTML = bankHtml.join("");
    }
  } else {
    qrContainerEl.style.display = "flex";
    if (bankDetailsEl) bankDetailsEl.style.display = "none";
    renderQRCode(state.qrValue || "");
  }

  

  // Update Title Meta
  document.getElementById("doc-invoice-number").textContent = state.invoiceNumber || "";

  // Update Client Details
  document.getElementById("doc-client-name").textContent = state.clientName || "";
  document.getElementById("doc-client-address").innerHTML = escapeHtml(state.clientAddress).replace(/\n/g, "<br>");
  document.getElementById("doc-client-email").textContent = state.clientEmail || "";
  document.getElementById("doc-client-phone").textContent = state.clientPhone || "";

  // Update Invoice Date
  document.getElementById("doc-invoice-date").textContent = formatInvoiceDate(state.invoiceDate);

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
    const formattedGst = formatNumber(rowAmount * (state.gstRate || 0) / 100);

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
  const code = state.currency === "INR" ? "INR" : "USD";
  const symbol = code === "INR" ? "₹" : "$";
  const gstTotal = subtotal * (state.gstRate || 0) / 100;
  const revision = state.revisionEnabled === false ? 0 : state.revisionCharges || 0;
  const discount = calculateDiscountAmount(subtotal);
  const grandTotal = subtotal + gstTotal + revision - discount;

  document.getElementById("doc-subtotal").textContent = `${symbol}${formatNumber(subtotal)}`;
  document.getElementById("doc-gst").textContent = `${symbol}${formatNumber(gstTotal)} (${formatNumber(state.gstRate || 0)}%)`;
  document.getElementById("doc-revision-label").textContent = state.revisionChargesLabel || "Charges";
  document.getElementById("doc-revision").textContent = `${symbol}${formatNumber(revision)}`;
  document.getElementById("doc-discount").textContent = `${discount > 0 ? "-" : ""}${symbol}${formatNumber(discount)}`;
  document.querySelector("#doc-discount-row .summary-label").textContent =
    state.discountType === "percentage" ? `Discount (${formatNumber(state.discountAmount || 0)}%):` : "Discount:";
  document.getElementById("doc-revision-row").hidden = state.revisionEnabled === false;
  document.getElementById("doc-discount-row").hidden = state.discountEnabled === false;
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
    qrBox.innerHTML = `<img src="${escapeHtml(state.customQrImageData)}" alt="Custom QR Code" style="width:100%; height:100%; object-fit:contain; border-radius:2px;">`;
    return;
  }

  // No payment link: leave the box empty rather than encoding a placeholder
  if (text.trim() === "") return;

  if (window.QRCode) {
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
  if (!validateInvoiceNumber()) {
    document.getElementById("invoice-number").reportValidity();
    return;
  }
  if (isInvoiceGenerating) return;
  if (!window.html2pdf) {
    handlePrintInvoice();
    return;
  }

  const historyEntry = createInvoiceHistoryEntry();
  if (!persistInvoiceHistory([...invoiceHistory, historyEntry])) return;

  isInvoiceGenerating = true;
  const element = document.getElementById("invoice-document");
  const filename = `Invoice_${state.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "")}.pdf`;

  // Temporary zoom reset for pristine capture
  const prevZoom = currentZoom;
  setZoom(1.0);

  const opt = {
    margin: 0,
    filename: filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      // use devicePixelRatio but avoid excessive scaling that can push content
      // slightly over one page and create a blank extra page
      scale: Math.min(1.5, window.devicePixelRatio || 1),
      useCORS: true,
      backgroundColor: state.invoiceColorMode === "light" ? "#ffffff" : "#111111"
    },
    jsPDF: {
      unit: "pt",
      format: "a4",
      orientation: "portrait"
    }
  };

  // Improve page-break handling to avoid an empty final page
  opt.pagebreak = { mode: ["css", "legacy"] };

  const finishGeneration = (error) => {
    if (error) {
      console.error("Unable to generate invoice PDF.", error);
      persistInvoiceHistory(invoiceHistory.filter((entry) => entry !== historyEntry));
      setInvoiceNumberStatus("The PDF could not be generated. Try again; this invoice number remains available.", true);
    }
  };

  element.classList.add("pdf-export");
  try {
    window.html2pdf().set(opt).from(element).save().then(
      () => finishGeneration(),
      (error) => finishGeneration(error)
    ).finally(() => {
      element.classList.remove("pdf-export");
      setZoom(prevZoom);
      isInvoiceGenerating = false;
    });
  } catch (error) {
    finishGeneration(error);
    element.classList.remove("pdf-export");
    setZoom(prevZoom);
    isInvoiceGenerating = false;
  }
}

/**
 * Reset Form to Sample PDF State
 */
function handleResetSample() {
  state = JSON.parse(JSON.stringify(initialInvoiceState));
  document.getElementById("company-profile").value = "";
  document.getElementById("client-profile").value = "";
  updateCompanyNameVisibility();
  syncFormInputs();
  updateClientNameVisibility();
  updatePaymentFieldsVisibility();
  updateChargeFieldsVisibility();
  updateDiscountInputLabel();
  document.getElementById("qr-image-upload").value = "";
  document.getElementById("remove-qr-image-btn").style.display = "none";
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

function formatInvoiceDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return "";

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
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
