export function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$0.00";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function splitEqual(amount, ids) {
  const n = ids.length || 1;
  const share = Number((amount / n).toFixed(2));
  const shares = {};
  let total = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (i === ids.length - 1) {
      shares[id] = Number((amount - total).toFixed(2));
    } else {
      shares[id] = share;
      total += share;
    }
  }
  return shares;
}

export function percentsSumTo100(percents) {
  const values = Object.values(percents).map(Number);
  return Math.abs(values.reduce((a, b) => a + b, 0) - 100) < 0.001;
}

export function splitByPercent(amount, percents) {
  const shares = {};
  let total = 0;
  const entries = Object.entries(percents);
  for (let i = 0; i < entries.length; i++) {
    const [id, pct] = entries[i];
    if (i === entries.length - 1) {
      shares[id] = Number((amount - total).toFixed(2));
    } else {
      const share = Number(((amount * Number(pct)) / 100).toFixed(2));
      shares[id] = share;
      total += share;
    }
  }
  return shares;
}

export function sharesForExpense(expense) {
  if (expense.splitType === "percent" && expense.percents) {
    return splitByPercent(expense.amount, expense.percents);
  }
  return splitEqual(expense.amount, expense.splitWith);
}
