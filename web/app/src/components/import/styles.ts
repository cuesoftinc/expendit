export const styles = {
  // Upload step
  dropZone: (dragging: boolean) =>
    `border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
      dragging
        ? "border-purpleTheme bg-purple-50 scale-[1.01]"
        : "border-gray-300 bg-grayTheme hover:border-purpleTheme hover:bg-purple-50"
    }`,
  uploadIcon: "mx-auto mb-4 text-5xl text-gray-400",
  uploadTitle: "text-lg font-semibold text-slate-700 mb-1",
  uploadSub: "text-sm text-gray-500 mb-6",
  uploadBtn:
    "inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-purpleTheme text-white font-semibold text-sm hover:opacity-90 transition",
  uploadHint: "text-xs text-gray-400 mt-4",

  // Stats bar
  statsBar: "flex flex-wrap gap-4 mb-6",
  statCard:
    "flex-1 min-w-[140px] bg-white rounded-xl p-4 shadow-sm border border-gray-100",
  statValue: "text-2xl font-bold text-slate-800",
  statLabel: "text-xs text-gray-500 mt-0.5",

  // Summary cards
  summaryGrid: "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6",
  summaryCard: (color: string) =>
    `rounded-xl p-5 text-white shadow-sm ${color}`,
  summaryAmount: "text-2xl font-bold",
  summaryLabel: "text-sm opacity-80 mt-1",

  // Anomaly
  anomalyBanner:
    "bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6",
  anomalyTitle: "text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1",
  anomalyItem: "text-sm text-amber-800 flex items-start gap-2 mb-1",

  // Category breakdown
  categorySection: "bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6",
  categoryRow: "flex justify-between items-center py-2 border-b border-gray-50 last:border-0",
  categoryBar: "h-2 rounded-full bg-purpleTheme mt-1",

  // Transaction table
  tableWrap: "bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-x-auto",
  table: "w-full text-sm",
  thead: "bg-grayTheme text-xs text-gray-500 uppercase",
  th: "px-4 py-3 text-left font-semibold",
  td: "px-4 py-3 border-b border-gray-50",
  typeBadge: (type: string) =>
    `inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
      type === "income"
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-600"
    }`,
  categorySelect:
    "text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:border-purpleTheme",

  // Actions
  actionBar: "flex gap-3 justify-end mt-2",
  confirmBtn:
    "px-6 py-2.5 rounded-lg bg-purpleTheme text-white font-semibold text-sm hover:opacity-90 transition",
  discardBtn:
    "px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition",

  // Done step
  doneWrap: "flex flex-col items-center justify-center py-20 text-center",
  doneIcon: "text-6xl mb-4",
  doneTitle: "text-xl font-bold text-slate-800 mb-2",
  doneSub: "text-gray-500 text-sm mb-6",
  doneBtn:
    "px-6 py-2.5 rounded-lg bg-purpleTheme text-white font-semibold text-sm hover:opacity-90 transition",

  // Shared
  sectionTitle: "text-sm font-semibold text-slate-700 mb-3",
  errorText: "text-sm text-red-500 mt-2",
};
