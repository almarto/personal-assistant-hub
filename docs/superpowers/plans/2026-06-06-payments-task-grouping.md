# Payments Task Name + Group Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the linked task name on each payment card and add a toggle that switches the payments list to a task-grouped view with per-group subtotals.

**Architecture:** Pure client-side rendering changes in `page.tsx` — no API or data model changes needed because `RenovationPayment.task_id` and the `tasks[]` state already exist. A new boolean state `groupByTask` drives the view mode. A local render helper de-duplicates the card JSX.

**Tech Stack:** Next.js App Router, React, TypeScript (strict), CSS Modules, next-intl

---

## Files

- **Modify:** `src/app/[locale]/renovations/page.tsx` — state, toggle, card task label, grouped renderer
- **Modify:** `src/app/[locale]/renovations/page.module.css` — two new classes for group section styling
- **Modify:** `messages/en.json` — three new i18n keys
- **Modify:** `messages/es.json` — three new i18n keys (Spanish translations)

---

### Task 1: Add i18n keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

- [ ] **Step 1: Add three keys to en.json under `Renovations`**

Open `messages/en.json`. Inside the `"Renovations"` object, after the `"methods"` block, add:

```json
"groupByTask": "Group by Task",
"unassigned": "Unassigned",
"subtotal": "Subtotal"
```

The `methods` block ends with `"card": "Card"`. The result should look like:

```json
"methods": {
  "transfer": "Transfer",
  "cash": "Cash",
  "card": "Card"
},
"groupByTask": "Group by Task",
"unassigned": "Unassigned",
"subtotal": "Subtotal"
```

- [ ] **Step 2: Add three keys to es.json under `Renovations`**

Same location in `messages/es.json`:

```json
"groupByTask": "Agrupar por tarea",
"unassigned": "Sin tarea",
"subtotal": "Subtotal"
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd /Users/almarto/development/personal-assistant-hub-priv
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "feat: add i18n keys for payment task grouping"
```

---

### Task 2: Add CSS for group section header

**Files:**
- Modify: `src/app/[locale]/renovations/page.module.css`

- [ ] **Step 1: Add two new CSS classes at the end of the file**

Append to `src/app/[locale]/renovations/page.module.css`:

```css
.groupSection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.groupSectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--card-bg, #fff);
  border-radius: 8px;
  border-left: 4px solid var(--primary-color, #0070f3);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color, #111);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/renovations/page.module.css
git commit -m "feat: add CSS classes for payment group sections"
```

---

### Task 3: Wire up state, toggle button, and payment card task label

**Files:**
- Modify: `src/app/[locale]/renovations/page.tsx`

- [ ] **Step 1: Add `groupByTask` state**

In `page.tsx`, find the existing state declarations around line 65–74 (the block with `fundType`, `includeInBudget`, `taskStartDate`, etc.). Add one new line after the `selectedGroupId` state:

```tsx
const [groupByTask, setGroupByTask] = useState(false);
```

Full context for the insertion point (add after line 72 `const [selectedGroupId, setSelectedGroupId] = useState<string>("");`):

```tsx
const [selectedGroupId, setSelectedGroupId] = useState<string>("");
const [groupByTask, setGroupByTask] = useState(false);
const [filterCategory, setFilterCategory] = useState<string>("");
```

- [ ] **Step 2: Add the toggle button next to "Add Payment"**

Find the block at approximately line 445:

```tsx
{activeTab === "payments" && (
  <Button onClick={() => openPaymentModal()}>
    <Plus size={20} /> {t("addPayment")}
  </Button>
)}
```

Replace it with:

```tsx
{activeTab === "payments" && (
  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
    <button
      className={`${styles.filterToggle} ${groupByTask ? styles.active : ""}`}
      onClick={() => setGroupByTask((v) => !v)}
    >
      {t("groupByTask")}
    </button>
    <Button onClick={() => openPaymentModal()}>
      <Plus size={20} /> {t("addPayment")}
    </Button>
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/renovations/page.tsx"
git commit -m "feat: add group-by-task toggle button to payments tab"
```

---

### Task 4: Update the payments rendering — task label on flat cards + grouped view

**Files:**
- Modify: `src/app/[locale]/renovations/page.tsx`

- [ ] **Step 1: Add a local `renderPaymentCard` helper inside the component**

Directly before the `return (` statement of the component (search for `return (` followed by `<PageLayout`), add this helper:

```tsx
const renderPaymentCard = (p: RenovationPayment) => {
  const linkedTask = tasks.find((tk) => tk.id === p.task_id);
  return (
    <div key={p.id} className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{p.payee}</h3>
          <span className={styles.cardSubtitle}>
            {new Date(p.payment_date).toLocaleDateString()}
          </span>
          {linkedTask && (
            <span
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "0.15rem",
              }}
            >
              {linkedTask.name}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            className={styles.deleteBtn}
            onClick={() => openPaymentModal(p)}
            style={{ color: "#0070f3" }}
          >
            <Edit2 size={18} />
          </button>
          <button
            className={styles.deleteBtn}
            onClick={() => handleDeletePayment(p.id)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <p style={{ margin: "0", fontSize: "0.9rem" }}>
        {t("method")}: {t(`methods.${p.method}`)}
      </p>
      <div className={styles.cardAmount}>
        €{parseFloat(p.amount).toFixed(2)}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add the grouped payments computation**

Directly after `renderPaymentCard`, add:

```tsx
const groupedPayments = (() => {
  const map = new Map<string, { label: string; items: RenovationPayment[] }>();
  for (const p of payments) {
    const task = tasks.find((tk) => tk.id === p.task_id);
    const key = task ? task.id : "__unassigned__";
    const label = task ? task.name : t("unassigned");
    if (!map.has(key)) map.set(key, { label, items: [] });
    map.get(key)!.items.push(p);
  }
  return [...map.entries()]
    .sort(([aKey, aVal], [bKey, bVal]) => {
      if (aKey === "__unassigned__") return 1;
      if (bKey === "__unassigned__") return -1;
      return aVal.label.localeCompare(bVal.label);
    })
    .map(([, val]) => val);
})();
```

- [ ] **Step 3: Replace the flat payments grid with the new renderer**

Find the existing payments block (approximately line 1177–1213):

```tsx
{activeTab === "payments" && (
  <div className={styles.grid}>
    {payments.map((p) => (
      <div key={p.id} className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>{p.payee}</h3>
            <span className={styles.cardSubtitle}>
              {new Date(p.payment_date).toLocaleDateString()}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              className={styles.deleteBtn}
              onClick={() => openPaymentModal(p)}
              style={{ color: "#0070f3" }}
            >
              <Edit2 size={18} />
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => handleDeletePayment(p.id)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <p style={{ margin: "0", fontSize: "0.9rem" }}>
          {t("method")}: {t(`methods.${p.method}`)}
        </p>
        <div className={styles.cardAmount}>
          €{parseFloat(p.amount).toFixed(2)}
        </div>
      </div>
    ))}
  </div>
)}
```

Replace the entire block with:

```tsx
{activeTab === "payments" && (
  groupByTask ? (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {groupedPayments.map(({ label, items }) => {
        const subtotal = items.reduce(
          (acc, p) => acc + parseFloat(p.amount),
          0
        );
        return (
          <div key={label} className={styles.groupSection}>
            <div className={styles.groupSectionHeader}>
              <span>{label}</span>
              <span style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 400 }}>
                  {items.length} {items.length === 1 ? "payment" : "payments"}
                </span>
                <span>
                  {t("subtotal")}: €{subtotal.toFixed(2)}
                </span>
              </span>
            </div>
            <div className={styles.grid}>
              {items.map((p) => renderPaymentCard(p))}
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className={styles.grid}>
      {payments.map((p) => renderPaymentCard(p))}
    </div>
  )
)}
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Start the dev server and manually verify**

```bash
pnpm dev
```

Check:
1. Go to `/renovations` → Payments tab
2. Each payment card that has a linked task shows the task name in small text below the date
3. Payments without a task show nothing extra
4. Click "Group by Task" toggle — button highlights (blue), cards reorganize into sections
5. Each section header shows: task name, payment count, and subtotal
6. Payments with no task appear under an "Unassigned" section at the bottom
7. Click toggle again — returns to flat view

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/renovations/page.tsx"
git commit -m "feat: show task name on payment cards and add group-by-task toggle"
```
