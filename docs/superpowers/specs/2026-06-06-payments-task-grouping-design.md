# Payments Tab: Task Name + Group by Task Toggle

## Summary

Add two enhancements to the Renovations payments tab:
1. Show the linked task name on each payment card (flat view)
2. A toggle that switches the flat list into task-grouped sections with subtotals

## Data Model

`RenovationPayment.task_id: string | null` already links payments to tasks.
The `tasks: RenovationTask[]` state is already loaded in the same component.

## Feature 1 — Task name on payment cards

- In the flat payment card, display the linked task's name as a small label below the payee.
- Lookup: `tasks.find(t => t.id === p.task_id)?.name`
- If `task_id` is null, render nothing.
- Placement: between the subtitle (date) and the method line.

## Feature 2 — Group by task toggle

### Toggle control
- New state: `groupByTask: boolean` (default `false`)
- Render a toggle button in the payments tab header row, to the left of "Add Payment"
- Label: `t("groupByTask")` — "Group by Task" / "Agrupar por tarea"

### Grouped view rendering
When `groupByTask` is true, replace the flat `<div className={styles.grid}>` with:

1. Compute `groupedPayments`: a `Map` from task name (or `"__unassigned__"`) to `RenovationPayment[]`, sorted alphabetically by task name, with unassigned at the end.
2. For each group render:
   - **Section header**: task name (or i18n `unassigned`) + payment count + subtotal `€X.XX`
   - **Cards grid**: same card JSX as flat view (with task name label omitted since header already shows it)

### i18n additions
Three keys added to `en.json` and `es.json` under `Renovations`:
- `groupByTask`: "Group by Task" / "Agrupar por tarea"
- `unassigned`: "Unassigned" / "Sin tarea"
- `subtotal`: "Subtotal" / "Subtotal"

## Scope

- No new dependencies.
- No changes to data model, actions, or API routes.
- Changes confined to `page.tsx`, `en.json`, `es.json`.
- Optional: minor CSS additions to `page.module.css` for group section header styling.
