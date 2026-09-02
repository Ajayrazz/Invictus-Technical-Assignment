# FairShare: Analysis & Future Improvements

This document serves as a comprehensive review of the FairShare application. It catalogs the critical bugs we have successfully resolved and compares the app's current functionality to a real-world, production-ready expense splitting application (like Splitwise). Finally, it outlines additional bugs, missing features, and structural improvements necessary to elevate FairShare to a production standard.

---

## 1. Resolved Bugs (The "Critical 12")
We have already tracked down and resolved the following 12 application-breaking bugs, which are fully documented in `BUGS.md`:

1. **Sorting & Hydration Failure:** The expense list was sorted oldest-first. Additionally, `Date` objects were parsed from `localStorage` as strings, breaking the sorting math (`b.date - a.date`) upon page reload.
2. **Destructive Mutation by Index:** When the expense list was filtered, editing or deleting an item used the *filtered array's index* instead of a unique ID, resulting in the wrong expense being permanently deleted or mutated in the global state.
3. **Payer Penalization:** A faulty conditional block incorrectly forced the payer to absorb a portion of the bill even if they were explicitly excluded from the split list.
4. **Rounding Leakage:** Dividing monetary amounts across splits resulted in infinite decimals that were rounded independently, meaning a $100 bill split 3 ways lost a cent ($99.99 total). We resolved this by allocating the exact mathematical remainder to the final person in the split.
5. **Missed Settlements:** The greedy algorithm for suggesting settlements skipped generating a transfer if a debtor owed the exact same amount that a creditor was owed.
6. **Strict Equality Filtering Issue:** The "Paid by" dropdown passed string values (e.g. `"1"`), but expenses stored numerical IDs (e.g. `1`). Strict inequality filtering caused all expenses to vanish when searching.
7. **Floating-Point Percentage Validation:** Splitting via "Custom %" failed to save valid combinations (like `0.1`, `0.2`, `99.7`) because JavaScript's floating-point math evaluated the sum to `100.00000000000004`, failing the strict `=== 100` validation check.
8. **Missing Settle Up Execution:** The app suggested settlements but lacked a native mechanism to actually execute them. We built a "Mark as settled" button that injects native settlement transactions to mathematically zero-out debts.
9. **Duplicate Member Names:** There was no validation preventing users from adding multiple members with the exact same name, breaking the settlement UI.
10. **Ghost Members (Deletion):** Added the ability to safely remove members, protected by a cascading validation check to ensure they aren't tied to active expenses.
11. **UI Overflow on Long Descriptions:** Forced long unbreakable strings (like IDs or URLs) in expense titles to wrap gracefully instead of overflowing the flexbox layout.
12. **Timezone Skew:** Expenses that were created with exact dates ("YYYY-MM-DD") were shifting backwards by a day for users in timezones behind UTC. We resolved this by forcing `toLocaleDateString` to render strictly in UTC.

---

## 2. Comparison with Real-World Splitting Apps (e.g., Splitwise)
While FairShare correctly handles core mathematical splits and balances, it fundamentally lacks several pillars required for a real-world SaaS application:

### Missing Core Mechanics
- **No "Settle Up" Execution:** FairShare *suggests* settlements, but it doesn't have a button to actually execute them. In a real app, users can click "Settle Up," which automatically generates a transaction (e.g., Person A pays Person B) and zeroes out their balances. In FairShare, balances will simply grow infinitely unless users manually hack in a "Settlement" expense.
- **Incomplete Editing Capabilities:** Currently, users can only edit the `amount` of an existing expense via a hidden inline input. If a user makes a typo in the description, date, payer, or split distribution, they are forced to delete the entire expense and recreate it from scratch.
- **No Authentication or Authorization:** The app uses a single shared client state. In reality, an app needs a backend database, user sessions (JWTs/OAuth), and role-based access control. Users should only be able to edit or delete expenses they are involved in, and expenses tied to a finalized settlement should be locked and immutable.

### Missing Quality of Life Features
- **Currency Support:** FairShare hardcodes the `$` symbol everywhere. Global apps require multi-currency support and real-time exchange rate conversions.
- **Receipt Scanning & Itemized Splits:** Real apps allow users to upload photos of receipts and assign individual line-items to specific people, calculating tax and tip proportionally, rather than manually calculating percentages beforehand.
- **Data Export:** Users often need to export their trip finances to CSV or PDF for personal records or expense reporting.

---

## 3. Outstanding Bugs & Vulnerabilities to Fix Next
If we continue developing FairShare, these are the most immediate bugs and edge cases we need to resolve:

- [ ] **Local Storage Quota Limits:** As users add thousands of expenses over years, `localStorage` will eventually hit its 5MB size limit. The app will crash if `localStorage.setItem` throws a `QuotaExceededError`. This needs a `try/catch` wrapper with a grace-degradation warning to the user.
- [ ] **Negative Settlements:** If an expense is accidentally added with a massive amount that breaks someone's balance into extreme negatives, the `settle.js` logic might generate circular debt loops.
