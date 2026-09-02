# Bugs found

Add one section per issue. Bug 1 is filled in to show the format — fix it, then write what you changed. Copy the blank template for the rest.

---

## Bug 1

**How to reproduce:** Open the app. The expense list says “Newest first”. The first row is Wine (7 Mar). Board game (15 Mar) is further down.

**How it was identified:** While reviewing the initial state of the app, the UI explicitly claimed "Newest first," but the dates on the list items were in chronological order (oldest first). Inspecting `ExpenseList.jsx` revealed that the sort function was subtracting the date value of `b` from `a`, which results in ascending order. Furthermore, when analyzing why sorting completely broke down after the page reloaded, I found that `loadState` in `store.js` failed to re-hydrate the dates back into JavaScript `Date` objects when parsing them from `localStorage`, causing the subtraction math `b.date - a.date` to evaluate to `NaN` and silently fail to sort.

**What is wrong:** The list is showing oldest expenses first. Newest should be at the top. Additionally, dates loaded from `localStorage` were kept as strings, causing the sorting algorithm to fail entirely upon page refresh.

**What I changed:** 
- In `src/components/ExpenseList.jsx`, I changed the sorting logic inside the `sort` method to `dateValue(b.date) - dateValue(a.date)` so that expenses are sorted in descending order by date.
- In `src/state/store.js`, I wrapped `JSON.parse(raw)` in the `hydrate()` function so that expense dates are properly converted back into native JavaScript `Date` objects upon reloading.

---

## Bug 2

**How to reproduce:** Filter the expenses using a category or a search query, then delete or edit the first item in the filtered list. Clear the filters, and you'll see a different expense was deleted/edited.

**How it was identified:** When evaluating how editing and deleting worked, I traced the `onDeleteAt` and `onUpdateAt` functions from `ExpenseList.jsx` back to the reducer in `store.js`. I noticed that `ExpenseList.jsx` was passing the `index` from the `.map()` function over the *sorted and filtered* array. However, the reducer was applying this index directly to the original, unsorted `state.expenses` array. This index mismatch meant operations were applied to the wrong expense.

**What is wrong:** `ExpenseList.jsx` passes the `index` of the filtered/sorted array to `onDeleteAt` and `onUpdateAt`. `App.jsx` forwards this index to the reducer, which uses it to modify the *original, unsorted* `state.expenses` array. This results in mutating the wrong element.

**What I changed:** 
- Modified `ExpenseList.jsx` to pass `expense.id` instead of the map `index`.
- Modified `App.jsx` to forward the `id`.
- Modified `store.js` reducer to find and delete/update the expense matching `action.id` instead of `action.index`.

---

## Bug 3

**How to reproduce:** Add an expense where the person who paid is *not* in the split list. Look at their balance in the Balances panel. Instead of just getting their money back in full, they owe a share of the expense.

**How it was identified:** The assignment README specifically states: "Anyone who was not involved should be left out of that bill." However, reviewing `src/lib/balances.js` revealed a specific `if` statement designed to subtract a share from the payer's balance if they weren't found in the split list. This actively contradicted the requirements.

**What is wrong:** In `src/lib/balances.js`, `computeBalances` checks if the payer is not in the split array. If they aren't, it manually subtracts an equal share from their balance. This penalizes the payer by forcing them to pay for a split they weren't part of.

**What I changed:** Removed the `if (!(exp.paidBy in shares) && !(String(exp.paidBy) in shares))` block entirely from `src/lib/balances.js`.

---

## Bug 4

**How to reproduce:** Create a $100 expense and split it equally among 3 people. Each pays $33.33, totaling $99.99. The remaining $0.01 is lost.

**How it was identified:** The assignment README warns: "the group should not “lose” or “invent” money in the rounding." Investigating `src/lib/money.js` showed that both `splitEqual` and `splitByPercent` calculate shares and unconditionally round them to 2 decimal places independently. I identified that mathematically, dividing a number like 100 by 3 and rounding to 2 decimal places results in $33.33 each, leaving $0.01 unaccounted for.

**What is wrong:** `splitEqual` and `splitByPercent` in `src/lib/money.js` just calculate each share and round it to 2 decimal places. This results in the sum of the shares not matching the total amount, effectively "losing" or "inventing" money due to rounding errors.

**What I changed:** In `src/lib/money.js`, I modified both functions to keep track of the total amount assigned so far. For the very last person in the split array, they receive the exact remaining amount (`amount - total`) instead of the calculated share. This guarantees the shares add up to the total perfectly without rounding loss.

---

## Bug 5

**How to reproduce:** Get into a state where Person A owes exactly $50, and Person B is owed exactly $50 (e.g. A paid $0 for a $100 bill split equally, and B paid $100). Check the "Settle Up" panel. No transfers are suggested.

**How it was identified:** While reviewing the settlement logic in `src/lib/settle.js`, I traced the while-loop that pairs debtors with creditors. The loop handled cases where a debtor owed more than the creditor was owed (`d.amount > c.amount`) and vice versa (`d.amount < c.amount`), pushing a transfer object in both cases. However, in the `else` block (when amounts are exactly equal), the pointers were incremented but no transfer was generated, leaving the settlement unresolved.

**What is wrong:** In `src/lib/settle.js`, `suggestSettlements` loops through debtors and creditors. If a debtor's amount equals the creditor's amount (`d.amount === c.amount`), the code increments the `i` and `j` pointers but fails to push a `transfers` object.

**What I changed:** Added a `transfers.push(...)` block in the `else` branch of `src/lib/settle.js` before incrementing `i` and `j`.

---

## Bug 6

**How to reproduce:** In the "Expenses" pane, try to filter the list using the "Paid by" dropdown. The list immediately empties, and all expenses disappear.

**How it was identified:** After testing the filter functionality, I discovered that the `App.jsx` component was incorrectly comparing the selected dropdown value with the expense's underlying data. The `<select>` element inherently passes its value as a String (e.g., `"1"`), but the expense objects store the `paidBy` attribute as a Number (e.g., `1`). 

**What is wrong:** In `src/App.jsx`, the strict inequality filter `e.paidBy !== paidBy` evaluates `1 !== "1"` to `true`. This mistakenly filters out every single expense because a number is strictly never equal to a string.

**What I changed:** In `src/App.jsx`, I updated the filter condition to explicitly cast both values to Strings before comparing: `String(e.paidBy) !== String(paidBy)`. This guarantees a safe comparison regardless of whether legacy expenses were saved to local storage with string or numeric IDs.

---

## Bug 7

**How to reproduce:** Try to create an expense using a "Custom %" split. Type in valid combinations of percentages that should logically add up to exactly 100, such as `0.1`, `0.2`, and `99.7`. The form will display an error message stating "Percentages must add to 100" and block you from saving.

**How it was identified:** Knowing that the form heavily relied on mathematical validation, I checked `src/lib/money.js`. The validation function `percentsSumTo100` was doing a strict equality check to enforce that the sum was `=== 100`. Because of the way JavaScript calculates floating-point math, certain combinations will equal `100.00000000000004` rather than exactly `100`.

**What is wrong:** The strict validation `=== 100` in `percentsSumTo100` is susceptible to floating-point precision errors, incorrectly blocking users from submitting mathematically valid percentage splits.

**What I changed:** In `src/lib/money.js`, I updated `percentsSumTo100` to introduce a small tolerance margin. Instead of a strict `=== 100`, it now calculates the absolute difference between the sum and 100, checking if the difference is smaller than `0.001`: `Math.abs(sum - 100) < 0.001`.

---

## Bug 8

**How to reproduce:** Create expenses that result in debts between members. Open the "Settle Up" panel. The panel displays suggestions for transfers (e.g. "Person A pays Person B $50"), but there is no mechanism to actually execute these transfers to zero out the balances.

**How it was identified:** While comparing the app's functionality against real-world splitting apps, I realized that suggesting a settlement is not enough. Without a way to "Mark as settled" natively, users' balances would grow infinitely over time unless they manually hacked a reverse transaction. The app lacked an automatic way to dispatch a zeroing transaction.

**What is wrong:** The `SettleUpPanel.jsx` component purely rendered text suggestions, providing no interactive button to execute the state change.

**What I changed:** 
- In `src/components/SettleUpPanel.jsx`, I added a "Mark as settled" button to each transfer suggestion that calls an `onSettle(transfer)` callback.
- In `src/App.jsx`, I passed the `onSettle` callback to dynamically trigger `addExpense`, creating a native "Settlement" expense behind the scenes that mathematically zeroes out the debt (Debtor pays Creditor 100% of the owed amount).
- In `src/components/AddExpenseForm.jsx`, I appended `"Settlement"` to the `CATEGORIES` array so these native transactions match the app's standard structure.

---

## Bug 9

**How to reproduce:** In the "Summary" panel, type a name that already exists in the app (e.g., "Ajay") and click "Add". A second member with the exact same name will be created.

**How it was identified:** While reviewing the member creation logic in `SummaryCards.jsx`, I noticed there was no validation preventing identical names. This would completely break the settlement UI, as users wouldn't know which "Ajay" owes which "Ajay."

**What is wrong:** The `onSubmit` handler in `SummaryCards.jsx` dispatched `ADD_MEMBER` immediately after confirming the input wasn't empty, ignoring whether the name already existed.

**What I changed:** I added a case-insensitive validation check inside the `onSubmit` handler: `members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())`. If it finds a match, it displays an alert and blocks the submission.

---

## Bug 10

**How to reproduce:** Make a typo when adding a member. Notice that there is no way to remove or edit that member; they are permanently stuck in the app.

**How it was identified:** `SummaryCards.jsx` lacked any UI or state management logic for deleting members.

**What is wrong:** The app simply didn't have a `DELETE_MEMBER` action in its reducer, nor did the UI expose a way to trigger it. Additionally, deleting a member without checking if they are tied to an active expense would instantly crash the app.

**What I changed:**
- In `store.js`, I added a `DELETE_MEMBER` case to the reducer to filter out the member by ID, and an `UPDATE_MEMBER` case to edit their name.
- In `SummaryCards.jsx`, I added both a "Remove" and "Edit" button next to each member.
- Clicking "Edit" replaces the row with an inline input field, allowing the user to seamlessly correct a typo. It includes duplicate name validation to ensure they don't rename themselves to an existing member.
- Inside `handleRemove`, I added a validation check that scans `expenses` to see if the user is a `paidBy` payer, in the `splitWith` array, or in the `percents` object. If they are, it blocks deletion with an alert. If not, it safely dispatches the deletion.

---

## Bug 11

**How to reproduce:** Create an expense with an incredibly long description that contains no spaces (e.g. `HotelBookingNumber12345678901234567890`). The text overflows the screen and breaks the layout.

**How it was identified:** During CSS and UI stress testing, long unbroken strings broke the flexbox boundaries of `.expense-title`.

**What is wrong:** The `.expense-title` class in `index.css` lacked wrapping rules for unbreakable words.

**What I changed:** In `src/index.css`, I added `word-break: break-word;` to the `.expense-title` block, ensuring long strings gracefully wrap to the next line without overflowing the container.

