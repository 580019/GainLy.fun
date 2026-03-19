const STORAGE_KEY = "mtrack:data";

const elements = {
  groupList: document.getElementById("group-list"),
  groupTitle: document.getElementById("group-title"),
  addGroup: document.getElementById("add-group"),
  
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebar-overlay"),
  toggleSidebar: document.getElementById("toggle-sidebar"),

  transactionForm: document.getElementById("transaction-form"),
  transactionType: document.getElementById("transaction-type"),
  transactionItem: document.getElementById("transaction-item"),
  transactionItemDropdown: document.getElementById("transaction-item-dropdown"),
  transactionNotes: document.getElementById("transaction-notes"),
  transactionAmount: document.getElementById("transaction-amount"),
  transactionDate: document.getElementById("transaction-date"),
  transactionSave: document.getElementById("transaction-save"),
  transactionCancel: document.getElementById("transaction-cancel"),
  transactionList: document.getElementById("transaction-list"),

  toggleSearch: document.getElementById("toggle-search"),
  searchFilters: document.getElementById("search-filters"),
  searchQuery: document.getElementById("search-query"),
  filterStart: document.getElementById("filter-start"),
  filterEnd: document.getElementById("filter-end"),
  clearFilters: document.getElementById("clear-filters"),

  exportData: document.getElementById("export-data"),
  importData: document.getElementById("import-data"),
  importFile: document.getElementById("import-file"),

  dashboardBuy: document.getElementById("dashboard-buy"),
  dashboardSell: document.getElementById("dashboard-sell"),
  dashboardProfit: document.getElementById("dashboard-profit"),
  groupBuy: document.getElementById("group-buy"),
  groupSell: document.getElementById("group-sell"),
  groupProfit: document.getElementById("group-profit"),
};

let store = {
  groups: [],
  activeGroupId: null,
};

const uiState = {
  search: "",
  startDate: "",
  endDate: "",
  editingTransactionId: null,
  pendingDeleteGroupId: null,
};

// Modal elements
const modalElements = {
  modal: document.getElementById("confirmation-modal"),
  overlay: document.getElementById("modal-overlay"),
  message: document.getElementById("modal-message"),
  confirmBtn: document.getElementById("modal-confirm"),
  cancelBtn: document.getElementById("modal-cancel"),
};

// Add Group Modal elements
const groupModalElements = {
  modal: document.getElementById("add-group-modal"),
  overlay: document.getElementById("group-modal-overlay"),
  nameInput: document.getElementById("group-name-input"),
  createBtn: document.getElementById("group-create-btn"),
  cancelBtn: document.getElementById("group-cancel-btn"),
};

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to parse storage", err);
    return null;
  }
}

function showConfirmationModal(message, onConfirm) {
  uiState.pendingDeleteGroupId = null;
  modalElements.message.textContent = message;
  modalElements.modal.removeAttribute("hidden");
  
  const handleConfirm = () => {
    onConfirm();
    closeConfirmationModal();
  };
  
  const handleCancel = () => {
    closeConfirmationModal();
  };
  
  modalElements.confirmBtn.onclick = handleConfirm;
  modalElements.cancelBtn.onclick = handleCancel;
  modalElements.overlay.onclick = handleCancel;
}

function closeConfirmationModal() {
  modalElements.modal.setAttribute("hidden", "");
  modalElements.confirmBtn.onclick = null;
  modalElements.cancelBtn.onclick = null;
  modalElements.overlay.onclick = null;
}

function showAddGroupModal() {
  groupModalElements.nameInput.value = "";
  groupModalElements.modal.removeAttribute("hidden");
  groupModalElements.nameInput.focus();
}

function closeAddGroupModal() {
  groupModalElements.modal.setAttribute("hidden", "");
  groupModalElements.nameInput.value = "";
}

function handleAddGroup() {
  const name = groupModalElements.nameInput.value.trim();
  if (!name) {
    alert("Please enter a group name");
    return;
  }
  addGroup(name);
  closeAddGroupModal();
}

function writeToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('en-PH', {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function calculateTotals(transactions) {
  return transactions.reduce(
    (acc, tx) => {
      const amount = Number(tx.amount) || 0;
      if (tx.type === "buy") {
        acc.buy += amount;
      } else {
        acc.sell += amount;
      }
      return acc;
    },
    { buy: 0, sell: 0 }
  );
}

function renderProfit(element, profit) {
  element.textContent = profit >= 0 ? formatCurrency(profit) : `-${formatCurrency(Math.abs(profit))}`;
  element.classList.remove("positive", "negative");
  element.classList.add(profit >= 0 ? "positive" : "negative");
}

function getFilteredTransactions(transactions) {
  return transactions.filter((tx) => {
    const search = uiState.search.trim().toLowerCase();
    const item = (tx.item || "").toLowerCase();

    if (search && !item.includes(search)) {
      return false;
    }

    if (uiState.startDate && tx.date < uiState.startDate) {
      return false;
    }

    if (uiState.endDate && tx.date > uiState.endDate) {
      return false;
    }

    return true;
  });
}

function getBoughtItems(group) {
  if (!group) return [];
  return [...new Set(
    group.transactions
      .filter((tx) => tx.type === "buy")
      .map((tx) => tx.item)
      .filter(Boolean)
  )].sort();
}

function populateItemDropdown() {
  const group = getActiveGroup();
  elements.transactionItemDropdown.innerHTML = '<option value="">Select an item...</option>';
  
  if (!group) return;
  
  const items = getBoughtItems(group);
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    elements.transactionItemDropdown.appendChild(option);
  });
}

function updateItemField() {
  const type = elements.transactionType.value;
  const isSell = type === "sell";
  
  if (isSell) {
    elements.transactionItem.hidden = true;
    elements.transactionItemDropdown.hidden = false;
    elements.transactionItemDropdown.required = true;
    populateItemDropdown();
  } else {
    elements.transactionItem.hidden = false;
    elements.transactionItemDropdown.hidden = true;
    elements.transactionItemDropdown.required = false;
  }
}

function closeSidebar() {
  elements.sidebar.classList.remove("active");
  elements.sidebarOverlay.classList.remove("active");
}

function toggleSidebar() {
  elements.sidebar.classList.toggle("active");
  elements.sidebarOverlay.classList.toggle("active");
}

function toggleSearchFilters() {
  const isHidden = elements.searchFilters.hasAttribute("hidden");
  if (isHidden) {
    elements.searchFilters.removeAttribute("hidden");
    elements.toggleSearch.classList.add("active");
  } else {
    elements.searchFilters.setAttribute("hidden", "");
    elements.toggleSearch.classList.remove("active");
  }
}

function startEditTransaction(transaction) {
  uiState.editingTransactionId = transaction.id;
  elements.transactionSave.textContent = "Update";
  elements.transactionCancel.hidden = false;

  elements.transactionType.value = transaction.type;
  updateItemField();
  
  if (transaction.type === "sell") {
    elements.transactionItemDropdown.value = transaction.item;
  } else {
    elements.transactionItem.value = transaction.item;
  }
  
  elements.transactionNotes.value = transaction.notes || "";
  elements.transactionAmount.value = transaction.amount;
  elements.transactionDate.value = transaction.date;
  
  const focusElement = transaction.type === "sell" ? elements.transactionItemDropdown : elements.transactionItem;
  focusElement.focus();
}

function exitEditMode() {
  uiState.editingTransactionId = null;
  elements.transactionSave.textContent = "Save";
  elements.transactionCancel.hidden = true;
  elements.transactionForm.reset();
  const today = new Date().toISOString().slice(0, 10);
  elements.transactionDate.value = today;
  
  // Reset to buy mode
  elements.transactionType.value = "buy";
  updateItemField();
}

function updateTransaction(id, updated) {
  const group = getActiveGroup();
  if (!group) return;
  const transaction = group.transactions.find((tx) => tx.id === id);
  if (!transaction) return;
  Object.assign(transaction, {
    type: updated.type,
    item: updated.item.trim(),
    notes: updated.notes || "",
    amount: Number(updated.amount),
    date: updated.date,
  });
  writeToStorage();
  render();
}

function validateImportedData(data) {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.groups)) return false;

  for (const group of data.groups) {
    if (!group || typeof group !== "object") return false;
    if (!group.id || !group.name) return false;
    if (!Array.isArray(group.transactions)) return false;

    for (const tx of group.transactions) {
      if (!tx || typeof tx !== "object") return false;
      if (!tx.id || !tx.type || !tx.item) return false;
      if (typeof tx.amount !== "number" && typeof tx.amount !== "string") return false;
      if (!tx.date) return false;
    }
  }

  return true;
}

function ensureUniqueIds(data) {
  const seen = new Set();

  for (const group of data.groups) {
    if (!group.id || seen.has(group.id)) {
      group.id = createId();
    }
    seen.add(group.id);

    if (!Array.isArray(group.transactions)) {
      group.transactions = [];
    }

    for (const tx of group.transactions) {
      if (!tx.id || seen.has(tx.id)) {
        tx.id = createId();
      }
      seen.add(tx.id);
    }
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mtrack-data.json";
  document.body.appendChild(anchor);
  anchor.click();
  URL.revokeObjectURL(url);
  anchor.remove();
}

function importDataFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!validateImportedData(data)) {
        alert("Invalid data format. Please import a valid JSON export.");
        return;
      }

      const confirmed = confirm("Replace current data with imported data?\nThis cannot be undone.");
      if (!confirmed) return;

      ensureUniqueIds(data);
      store = data;
      if (!store.activeGroupId && store.groups.length) {
        store.activeGroupId = store.groups[0].id;
      }
      writeToStorage();
      exitEditMode();
      render();
    } catch (error) {
      alert("Could not parse file. Make sure it's a valid JSON file.");
    }
  };
  reader.readAsText(file);
}

function setActiveGroup(id) {
  store.activeGroupId = id;
  writeToStorage();
  render();
}

function getActiveGroup() {
  return store.groups.find((g) => g.id === store.activeGroupId);
}

function addGroup(name) {
  const id = createId();
  store.groups.push({ id, name: name.trim(), transactions: [] });
  store.activeGroupId = id;
  writeToStorage();
  render();
}

function removeGroup(id) {
  showConfirmationModal("Delete this group and all its transactions?\nThis cannot be undone.", () => {
    store.groups = store.groups.filter((g) => g.id !== id);
    if (store.activeGroupId === id) {
      store.activeGroupId = store.groups.length ? store.groups[0].id : null;
    }
    writeToStorage();
    render();
  });
}

function addTransaction({ type, item, amount, date, notes }) {
  const group = getActiveGroup();
  if (!group) return;
  group.transactions.push({
    id: createId(),
    type,
    item: item.trim(),
    notes: notes || "",
    amount: Number(amount),
    date,
  });
  writeToStorage();
  render();
}

function removeTransaction(transactionId) {
  const confirmed = confirm("Delete this transaction?\nThis cannot be undone.");
  if (!confirmed) return;

  const group = getActiveGroup();
  if (!group) return;
  group.transactions = group.transactions.filter((tx) => tx.id !== transactionId);
  writeToStorage();
  render();
}

function renderGroupList() {
  elements.groupList.innerHTML = "";

  store.groups.forEach((group) => {
    const li = document.createElement("li");
    li.className = "group-list__item";

    if (group.id === store.activeGroupId) {
      li.classList.add("group-list__item--active");
    }

    const name = document.createElement("span");
    name.className = "group-list__name";
    name.textContent = group.name;
    name.addEventListener("click", () => setActiveGroup(group.id));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "group-list__remove";
    remove.title = "Delete group";
    remove.textContent = "×";
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      removeGroup(group.id);
    });

    li.append(name, remove);
    elements.groupList.appendChild(li);
  });

  if (!store.groups.length) {
    const empty = document.createElement("p");
    empty.style.color = "rgba(245, 247, 255, 0.6)";
    empty.style.margin = "0";
    empty.textContent = "Create a group to get started.";
    elements.groupList.appendChild(empty);
  }
}

function renderDashboard() {
  const totals = store.groups.reduce(
    (acc, group) => {
      const groupTotals = calculateTotals(group.transactions);
      acc.buy += groupTotals.buy;
      acc.sell += groupTotals.sell;
      return acc;
    },
    { buy: 0, sell: 0 }
  );

  const profit = totals.sell - totals.buy;
  elements.dashboardBuy.textContent = formatCurrency(totals.buy);
  elements.dashboardSell.textContent = formatCurrency(totals.sell);
  renderProfit(elements.dashboardProfit, profit);
}

function renderGroupDetails() {
  const active = getActiveGroup();
  if (!active) {
    elements.groupTitle.textContent = "Select a group";
    elements.transactionForm.style.opacity = "0.45";
    elements.transactionForm.style.pointerEvents = "none";
    elements.transactionList.innerHTML = "";
    elements.groupBuy.textContent = "$0.00";
    elements.groupSell.textContent = "$0.00";
    elements.groupProfit.textContent = "$0.00";
    return;
  }

  elements.transactionForm.style.opacity = "1";
  elements.transactionForm.style.pointerEvents = "auto";
  elements.groupTitle.textContent = active.name;

  const totals = calculateTotals(active.transactions);
  const profit = totals.sell - totals.buy;

  elements.groupBuy.textContent = formatCurrency(totals.buy);
  elements.groupSell.textContent = formatCurrency(totals.sell);
  renderProfit(elements.groupProfit, profit);

  elements.transactionList.innerHTML = "";

  const filtered = getFilteredTransactions(active.transactions);
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!active.transactions.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.style.textAlign = "center";
    td.style.padding = "24px 0";
    td.style.color = "rgba(245, 247, 255, 0.55)";
    td.textContent = "No transactions yet.";
    tr.appendChild(td);
    elements.transactionList.appendChild(tr);
    return;
  }

  if (!sorted.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.style.textAlign = "center";
    td.style.padding = "24px 0";
    td.style.color = "rgba(245, 247, 255, 0.55)";
    td.textContent = "No transactions match the filters.";
    tr.appendChild(td);
    elements.transactionList.appendChild(tr);
    return;
  }

  sorted.forEach((tx) => {
    const tr = document.createElement("tr");

    const dateTd = document.createElement("td");
    dateTd.textContent = tx.date;

    const typeTd = document.createElement("td");
    typeTd.textContent = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
    typeTd.className = tx.type === "buy" ? "type-buy" : "type-sell";

    const itemTd = document.createElement("td");
    itemTd.textContent = tx.item;

    const amountTd = document.createElement("td");
    amountTd.textContent = formatCurrency(tx.amount);

    const actionTd = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditTransaction(tx));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Delete";
    removeBtn.addEventListener("click", () => removeTransaction(tx.id));

    actionTd.append(editBtn, removeBtn);

    tr.append(dateTd, typeTd, itemTd, amountTd, actionTd);
    elements.transactionList.appendChild(tr);
  });
}

function render() {
  renderGroupList();
  renderDashboard();
  renderGroupDetails();
}

function init() {
  const saved = readFromStorage();
  if (saved && Array.isArray(saved.groups)) {
    store = saved;
  }

  if (!store.groups.length) {
    store.groups = [
      {
        id: createId(),
        name: "General",
        transactions: [],
      },
    ];
    store.activeGroupId = store.groups[0].id;
  }

  // Set default date to today
  const today = new Date().toISOString().slice(0, 10);
  elements.transactionDate.value = today;

  render();
  exitEditMode();

  elements.addGroup.addEventListener("click", () => {
    showAddGroupModal();
  });

  groupModalElements.createBtn.addEventListener("click", handleAddGroup);
  groupModalElements.cancelBtn.addEventListener("click", closeAddGroupModal);
  groupModalElements.overlay.addEventListener("click", closeAddGroupModal);
  
  groupModalElements.nameInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      handleAddGroup();
    }
  });

  elements.transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const type = elements.transactionType.value;
    const item = (type === "sell" ? elements.transactionItemDropdown.value : elements.transactionItem.value).trim();
    const amount = elements.transactionAmount.value;
    const date = elements.transactionDate.value;
    const notes = elements.transactionNotes.value.trim();

    if (!item || !amount || !date) return;

    if (uiState.editingTransactionId) {
      updateTransaction(uiState.editingTransactionId, { type, item, amount, date, notes });
      exitEditMode();
    } else {
      addTransaction({ type, item, amount, date, notes });
    }

    elements.transactionItem.value = "";
    elements.transactionItemDropdown.value = "";
    elements.transactionNotes.value = "";
    elements.transactionAmount.value = "";
    elements.transactionType.value = "buy";
    elements.transactionDate.value = today;
    updateItemField();
  });

  elements.transactionType.addEventListener("change", updateItemField);

  elements.transactionCancel.addEventListener("click", () => {
    exitEditMode();
  });

  elements.toggleSidebar.addEventListener("click", toggleSidebar);
  elements.sidebarOverlay.addEventListener("click", closeSidebar);

  elements.toggleSearch.addEventListener("click", toggleSearchFilters);

  elements.searchQuery.addEventListener("input", (event) => {
    uiState.search = event.target.value;
    renderGroupDetails();
  });

  elements.filterStart.addEventListener("change", (event) => {
    uiState.startDate = event.target.value;
    renderGroupDetails();
  });

  elements.filterEnd.addEventListener("change", (event) => {
    uiState.endDate = event.target.value;
    renderGroupDetails();
  });

  elements.clearFilters.addEventListener("click", () => {
    uiState.search = "";
    uiState.startDate = "";
    uiState.endDate = "";
    elements.searchQuery.value = "";
    elements.filterStart.value = "";
    elements.filterEnd.value = "";
    renderGroupDetails();
  });

  elements.exportData.addEventListener("click", exportData);
  elements.importData.addEventListener("click", () => elements.importFile.click());
  elements.importFile.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importDataFromFile(file);
    event.target.value = "";
  });

  // Close sidebar when clicking on a group on mobile
  elements.groupList.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  });
}

init();
