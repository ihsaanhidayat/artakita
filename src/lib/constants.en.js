// ============================================================
// ARTAKITA — ENGLISH
// ============================================================

export const APP_NAME    = "ArtaKita";
export const APP_TAGLINE = "My Finance, Your Finance";
export const APP_VERSION = "2.0.0";
export const APP_AUTHOR  = "MIH";

export const NAV = {
  HOME:    "Home",
  STATS:   "Stats",
  FINANCE: "Finance",
  MORE:    "More",
};

export const HOME = {
  TOTAL_BALANCE:  "Total Balance",
  CIRCULATION:    "Current Flow",
  INCOME:         "Income",
  EXPENSE:        "Expense",
  ACTIVITY_LOG:   "Activity Log",
  SEARCH_HINT:    "Search transactions...",
  EMPTY:          "No transactions yet",
  LOAD_MORE:      "Load More",
  LOADING:        "Loading...",
  FILTER_TODAY:   "Today",
  FILTER_WEEK:    "7 Days",
  FILTER_MONTH:   "This Month",
  FILTER_CUSTOM:  "Pick Date",
  ALL_CATEGORIES: "All",
  DATE_FROM:      "From Date",
  DATE_TO:        "To Date",
  OFFLINE_MSG:    "Offline — transactions will sync when online",
  SYNCING_MSG:    (n) => `Syncing ${n} transactions...`,
  PENDING_MSG:    (n) => `${n} transactions pending sync`,
};

export const WALLET = {
  TITLE:       "Wallet",
  PERSONAL:    "Personal Wallet",
  SHARED_WITH: (u) => `Shared with @${u}`,
  SHARED_BY:   (u) => `Shared by @${u}`,
  ACTIVE:      "Active",
  ADD_NEW:     "Add New Wallet",
  NAME_LABEL:  "Wallet Name",
  NAME_HINT:   "E.g.: Main Account",
  SAVE:        "Save",
  OPEN:        "Open Wallet",
};

export const STATS = {
  TITLE:          "Statistics",
  TAB_EXPENSE:    "Expenses",
  TAB_ALLOCATION: "Allocation",
  TOTAL_EXPENSE:  "Total Expenses",
  TOTAL_INCOME:   "Income",
  CATEGORY_DETAIL:"Category Breakdown",
  ALLOCATION:     "Budget Allocation",
  SET_LIMIT:      "Set Limit",
  LIMIT_LABEL:    "Budget Limit",
  LIMIT_HINT:     "E.g.: 500k, 1m",
  DELETE_LIMIT:   "Remove Limit",
  SAVE_LIMIT:     "Save Limit",
  USED_THIS_MONTH:"Used this month",
  CURRENT_LIMIT:  "Current limit",
  REMAINING:      "Remaining",
  OVER_LIMIT:     "Over Budget!",
  NOT_SET:        "Not set",
  WARNING_OVER:   "Total allocation exceeds balance. Adjust your budget limits.",
  AFTER_ALLOC:    "Balance after allocation",
  HEALTH_TITLE:   "Financial Health",
  NO_DATA:        "No data this month",
  GRADE: {
    A: "Excellent! Your cash surplus is safe.",
    B: "Good. Your finances are stable this month.",
    C: "Warning. Reduce unnecessary spending.",
    D: "Danger! Expenses nearly exceed income.",
    F: "Deficit! No income recorded yet.",
    "-": "No transactions this month.",
  },
};

export const FINANCE = {
  TITLE:          "Finance",
  DEBTS:          "Debts & Receivables",
  RECURRING:      "Recurring Transactions",
  ASSETS:         "Asset Management",
  CATEGORIES:     "Categories",
  SAVINGS:        "Savings & Goals",
  DEBTS_SUB:      "Track debts & receivables",
  RECURRING_SUB:  "Scheduled recurring transactions",
  ASSETS_SUB:     "Inventory of goods & property",
  CATEGORIES_SUB: "Manage transaction categories",
  SAVINGS_SUB:    "Savings & dream goals",
};

export const DEBT = {
  TITLE:        "Debts & Receivables",
  TAB_DEBT:     "Debts",
  TAB_RECEIVE:  "Receivables",
  TAB_PAID:     "Settled",
  TOTAL_DEBT:   "Total Debt",
  TOTAL_REC:    "Total Receivable",
  SORT:         "Sort By",
  SORT_NOMINAL: "Largest Amount",
  SORT_PERCENT: "Most Paid",
  SORT_DUEDATE: "Nearest Due Date",
  ADD_NEW:      "New Record",
  PERSON_NAME:  "Name",
  PERSON_HINT:  "E.g.: John, Jane",
  NOMINAL:      "Amount",
  NOMINAL_HINT: "E.g.: 500k, 1m",
  DUE_DATE:     "Due Date",
  PAY_DEBT:     "Pay Debt",
  RECEIVE:      "Receive Payment",
  CANCEL:       "Cancel",
  EDIT:         "Edit",
  DELETE:       "Delete",
  SAVE:         "Save",
  PAID_BADGE:   "Settled",
  PAID_PERCENT: "Paid",
  REMAINING:    "Remaining",
  PAYMENT_HISTORY: "Payment History",
  EMPTY_DEBT:   "No debt records",
  EMPTY_REC:    "No receivable records",
  EMPTY_PAID:   "Nothing settled yet",
  SAVE_DEBT:    "Save Debt",
  SAVE_REC:     "Save Receivable",
  WALLET_BALANCE: "Wallet balance",
  EXCEED_DEBT:  (v) => `Exceeds remaining debt: Rp ${v}`,
  EXCEED_BAL:   (v) => `Insufficient balance! Balance: Rp ${v}`,
  EXCEED_ZERO:  "Amount must be greater than 0",
};

export const ASSET = {
  TITLE:        "Asset Management",
  TOTAL_ASSETS: "Total Assets",
  TOTAL_VALUE:  "Estimated Value",
  ITEMS:        "items recorded",
  ADD_NEW:      "Add Asset",
  EDIT:         "Edit Asset",
  NAME_LABEL:   "Item Name",
  NAME_HINT:    "E.g.: Dell Laptop, iPhone 15",
  STORE_LABEL:  "Store Name",
  STORE_HINT:   "Amazon, Apple Store...",
  DATE_LABEL:   "Purchase Date",
  PRICE_LABEL:  "Purchase Price",
  PRICE_HINT:   "E.g.: 5m, 500k",
  CONDITION:    "Condition",
  NOTES_LABEL:  "Notes",
  NOTES_HINT:   "Serial number, warranty...",
  PHOTO:        "Asset Photo",
  CAMERA:       "Camera / Gallery",
  SAVE:         "Save Asset",
  UPDATE:       "Update Asset",
  EMPTY:        "No assets recorded",
  CONDITIONS: {
    baru:          "New",
    baik:          "Good",
    perlu_servis:  "Needs Service",
    rusak:         "Damaged",
  },
};

export const RECURRING = {
  TITLE:        "Recurring Transactions",
  TOTAL:        "Total",
  ACTIVE:       "Active",
  DUE:          "Due",
  ADD_NEW:      "Add Schedule",
  EDIT:         "Edit Schedule",
  NOTE_LABEL:   "Note",
  NOTE_HINT:    "E.g.: Salary, Netflix",
  AMOUNT:       "Amount",
  CATEGORY:     "Category",
  FREQ:         "Frequency",
  NEXT_DATE:    "Next Schedule",
  RUN_NOW:      "Run Now",
  ACTIVATE:     "Activate",
  DEACTIVATE:   "Deactivate",
  INACTIVE:     "Inactive",
  SAVE:         "Save Schedule",
  UPDATE:       "Update Schedule",
  EMPTY:        "No recurring transactions",
  DUE_ALERT:    (n) => `${n} recurring transactions due`,
  FREQ_DAILY:   "Daily",
  FREQ_WEEKLY:  "Weekly",
  FREQ_MONTHLY: "Monthly",
  EVERY_DAY:    "Every day",
  EVERY_WEEK:   "Every 7 days",
  EVERY_MONTH:  "Every month",
};

export const MORE = {
  TITLE:         "More",
  EXPORT:        "Export Report",
  EXPORT_SUB:    "Download data to Excel file",
  USER_MGMT:     "User Management",
  USER_MGMT_SUB: "Manage user accounts (Admin)",
  ABOUT:         "About App",
  ABOUT_SUB:     `Version ${APP_VERSION}`,
  LANGUAGE:      "Language",
  LANGUAGE_SUB:  "Change display language",
  LOGOUT:        "Sign Out",
  LOGOUT_YES:    "Yes, Sign Out",
  BY_AUTHOR:     `made with ♥ by ${APP_AUTHOR}`,
};

export const ABOUT = {
  TITLE:   "About ArtaKita",
  VERSION: `Version ${APP_VERSION}`,
  DESC:    "A smart, fast, and secure personal & shared finance management app.",
  FEATURES:"Key Features",
  FEATURE_LIST: [
    "Smart transaction recording",
    "Debt & receivable management",
    "Asset tracking",
    "Automatic recurring transactions",
    "Statistics & budget allocation",
    "Shared wallet collaboration",
    "Offline mode with sync",
  ],
  TECH:    "Built with Next.js, Supabase & ♥",
  BY:      `by ${APP_AUTHOR}`,
};

export const FORM = {
  SAVE:       "Save",
  CANCEL:     "Cancel",
  EDIT:       "Edit",
  DELETE:     "Delete",
  ADD:        "Add",
  CLOSE:      "Close",
  PROCESSING: "Processing...",
  SAVING:     "Saving...",
  UPLOADING:  "Uploading...",
  LOADING:    "Loading...",
};

export const LOGIN = {
  TITLE:          APP_NAME,
  TAGLINE:        APP_TAGLINE,
  USERNAME_LABEL: "Username / Email",
  USERNAME_HINT:  "Enter username or email",
  PASSWORD_LABEL: "Password",
  PASSWORD_HINT:  "••••••••",
  SUBMIT:         "Sign In",
  LOADING:        "Processing...",
  WRONG_PASS:     (r) => `Wrong password! (${r} attempts left)`,
  LOCKED:         "Access locked. Wait 30 seconds.",
  FORCE_TITLE:    "Change Password",
  FORCE_DESC:     "For security, change your default password before continuing.",
  NEW_PASS_HINT:  "Enter New Password",
  FORCE_SUBMIT:   "Save & Continue",
};

export const TOAST = {
  TRX_ADDED:    "Transaction recorded! ✨",
  TRX_UPDATED:  "Transaction updated!",
  TRX_DELETED:  "Transaction deleted.",
  EXPORT_OK:    "Report downloaded!",
  OFFLINE:      "No internet connection",
  SYNCED:       (n) => `${n} transactions synced!`,
  ERROR:        "Something went wrong. Try again.",
  FORMAT_ERROR: "Wrong format! E.g.: 50k lunch",
};

export const CONFIRM = {
  DELETE_TRX:  "Permanently delete this transaction?",
  CANT_UNDO:   "This action cannot be undone.",
  DELETE_BTN:  "Delete",
  CANCEL_BTN:  "Cancel",
};

export const CMD = {
  HINT:          "E.g.: 50k lunch  |  in 5m salary",
  INCOME_PREFIX: "in",
};

export const LANG = {
  TITLE:      "Language",
  ID:         "Indonesia",
  EN:         "English",
  CHANGE_MSG: "Language changed!",
};
