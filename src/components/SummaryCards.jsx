import { useMemo, useState } from "react";
import { formatMoney } from "../lib/money.js";
import { totalSpent } from "../lib/balances.js";

export default function SummaryCards({ members, expenses, onAddMember, onUpdateMember, onDeleteMember }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const perPerson = useMemo(() => {
    return members.map((m) => {
      const paid = expenses
        .filter((e) => e.paidBy === m.id)
        .reduce((s, e) => s + Number(e.amount), 0);
      return { id: m.id, name: m.name, paid };
    });
  }, [expenses, members]);

  const spent = totalSpent(expenses);

  function handleRemove(id) {
    const isTied = expenses.some((e) => {
      if (e.paidBy === id) return true;
      if (e.splitWith && e.splitWith.includes(id)) return true;
      if (e.percents && Object.keys(e.percents).includes(String(id))) return true;
      return false;
    });

    if (isTied) {
      alert("Cannot remove this member because they are tied to an active expense.");
      return;
    }
    onDeleteMember(id);
  }

  function handleSaveEdit(id) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    if (
      members.some(
        (m) => m.id !== id && m.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      alert("A member with this name already exists.");
      return;
    }
    onUpdateMember(id, trimmed);
    setEditingId(null);
  }

  return (
    <section className="card">
      <h2>Summary</h2>
      <div className="summary-grid">
        <div className="stat">
          Expenses
          <b>{expenses.length}</b>
        </div>
        <div className="stat">
          Group total
          <b>{formatMoney(spent)}</b>
        </div>
        <div className="stat">
          Members
          <b>{members.length}</b>
        </div>
        <div className="stat">
          Avg / person
          <b>{formatMoney(members.length ? spent / members.length : 0)}</b>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="legend">Paid so far</div>
        {perPerson.map((p) => (
          <div className="person-stat" key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {editingId === p.id ? (
              <div style={{ display: "flex", gap: "8px", flex: 1, marginRight: "8px" }}>
                <input
                  autoFocus
                  style={{ flex: 1, padding: "4px" }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(p.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button
                  className="btn small ghost"
                  onClick={() => handleSaveEdit(p.id)}
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <div>
                  <span>{p.name}</span>
                  <span style={{ marginLeft: 8 }}>{formatMoney(p.paid)}</span>
                </div>
                <div>
                  <button
                    className="btn small ghost"
                    style={{ marginRight: 6 }}
                    type="button"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditName(p.name);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn small ghost"
                    type="button"
                    onClick={() => handleRemove(p.id)}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <form
        style={{ marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return;
          
          if (members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
            alert("A member with this name already exists.");
            return;
          }

          onAddMember(trimmed);
          setName("");
        }}
      >
        <div className="row">
          <div className="field">
            <label htmlFor="newMember">Add member</label>
            <input
              id="newMember"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
            />
          </div>
          <button className="btn ghost" type="submit" style={{ alignSelf: "end" }}>
            Add
          </button>
        </div>
      </form>
    </section>
  );
}
