import { applyStack, type Discount, type Result } from "./calc";
import { currencySymbol, formatMoney, formatPercent } from "./format";
import { CURRENCIES, readStack, writeStack, type Currency, type Stack } from "./url";

type Row = { kind: Discount["kind"]; value: number }; // a percentage, or an amount in currency units
type State = { price: number; currency: Currency; rows: Row[] };

const NEW_ROW_VALUE = 10;
/** Below this width the red fill no longer reaches under the word "Really". */
const NAME_FITS_PERCENT = 30;

const app = document.querySelector<HTMLElement>("#app")!;
const initial = readStack(location.search);
const state: State = {
  price: initial.priceCents / 100,
  currency: initial.currency,
  rows: initial.discounts.map((d) =>
    d.kind === "percent" ? { kind: "percent", value: d.value } : { kind: "amount", value: d.cents / 100 },
  ),
};

/** Only rows a checkout could apply count; a half-typed one is skipped until it makes sense. */
function toStack(s: State): Stack {
  const discounts: Discount[] = [];
  for (const r of s.rows) {
    if (!Number.isFinite(r.value) || r.value <= 0) continue;
    if (r.kind === "percent" && r.value <= 100) discounts.push({ kind: "percent", value: r.value });
    if (r.kind === "amount") discounts.push({ kind: "amount", cents: Math.round(r.value * 100) });
  }
  const priceCents = Number.isFinite(s.price) && s.price > 0 ? Math.round(s.price * 100) : 0;
  return { priceCents, currency: s.currency, discounts };
}

const money = (cents: number) => formatMoney(cents, state.currency);
const symbol = () => currencySymbol(state.currency);
const label = (d: Discount) => (d.kind === "percent" ? `−${formatPercent(d.value)}` : `−${money(d.cents)}`);
const rowLabel = (r: Row) =>
  r.kind === "percent" ? `−${formatPercent(r.value || 0)}` : `−${money(Math.round((r.value || 0) * 100))}`;

app.innerHTML = `
  <header>
    <div class="brand-row">
      <p class="kicker">Black Friday math</p>
      <a class="handle" href="https://www.instagram.com/nicoscript/" rel="noopener">
        <picture>
          <source srcset="./logo-on-light.png" media="(prefers-color-scheme: light)" />
          <img src="./logo-on-dark.png" alt="" width="22" height="22" />
        </picture>
        @nicoscript
      </a>
    </div>
    <h1 id="title"></h1>
  </header>
  <section class="card inputs" aria-label="Your discounts">
    <div class="price-row">
      <div class="field grow">
        <label for="price">Original price</label>
        <input id="price" type="number" inputmode="decimal" min="0" step="0.01" />
      </div>
      <div class="field">
        <label for="currency">Currency</label>
        <select id="currency">${CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join("")}</select>
      </div>
    </div>
    <ol class="discounts" id="discounts"></ol>
    <div class="add">
      <button type="button" id="add-percent">Add % off</button>
      <button type="button" id="add-amount"></button>
    </div>
  </section>
  <section class="card answer" aria-label="What you really pay">
    <p role="status" aria-live="polite" class="result" id="result"></p>
    <div class="bars" aria-hidden="true">
      <div class="bar sounds"><span class="bar-name">Sounds like</span><span class="fill" id="fill-sounds"></span><span class="bar-value" id="value-sounds"></span></div>
      <div class="bar real"><span class="bar-name">Really</span><span class="fill" id="fill-real"></span><span class="bar-value" id="value-real"></span></div>
    </div>
    <ol class="steps" data-testid="steps" id="steps"></ol>
  </section>
  <footer>Each discount comes off the price left by the one before it. Nothing leaves your browser.</footer>
`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const priceInput = $<HTMLInputElement>("price");
const currencySelect = $<HTMLSelectElement>("currency");
const list = $<HTMLOListElement>("discounts");
const addAmount = $<HTMLButtonElement>("add-amount");

priceInput.value = String(state.price);
currencySelect.value = state.currency;

/** Rebuilds the discount rows; `focus` keeps the keyboard where the person was working. */
function renderRows(focus?: { index: number; what: "input" | "remove" }) {
  list.innerHTML = "";
  state.rows.forEach((row, i) => {
    const n = i + 1;
    const unit = row.kind === "percent" ? "%" : symbol();
    const li = document.createElement("li");
    li.className = "discount";
    li.innerHTML = `
      <label for="d${n}">Discount ${n} (${unit})</label>
      <div class="discount-input">
        <input id="d${n}" type="number" inputmode="decimal" min="0" ${row.kind === "percent" ? 'max="100" step="1"' : 'step="0.01"'} />
        <button type="button" class="remove">×</button>
      </div>`;
    const input = li.querySelector("input")!;
    const remove = li.querySelector<HTMLButtonElement>(".remove")!;
    input.value = String(row.value);
    const name = () => remove.setAttribute("aria-label", `Remove discount ${n} (${rowLabel(row)})`);
    name();
    input.addEventListener("input", () => {
      row.value = input.valueAsNumber;
      name();
      update();
    });
    remove.addEventListener("click", () => {
      state.rows.splice(i, 1);
      // The next row's Remove button slides into this place; with none left, Add takes focus.
      renderRows({ index: i, what: "remove" });
      update();
    });
    list.append(li);
  });
  if (focus) {
    const target = list.querySelectorAll<HTMLElement>(focus.what === "input" ? "input" : ".remove")[focus.index];
    (target ?? $("add-percent")).focus();
  }
  addAmount.textContent = `Add ${symbol()} off`;
}

function sentence(r: Result) {
  const head = `You pay ${money(r.finalCents)}. That's ${formatPercent(r.realPercent)} off`;
  return r.soundsLikePercent === r.realPercent ? `${head}.` : `${head}, not ${formatPercent(r.soundsLikePercent)}.`;
}

function update() {
  const stack = toStack(state);
  const r = applyStack(stack.priceCents, stack.discounts);
  const title = `Is it really ${formatPercent(r.soundsLikePercent)} off?`;
  $("title").textContent = title;
  document.title = title;
  $("result").textContent = stack.priceCents > 0 ? sentence(r) : "Enter a price to see what you really pay.";

  $("value-sounds").textContent = formatPercent(r.soundsLikePercent);
  $("value-real").textContent = formatPercent(r.realPercent);
  $("fill-sounds").style.setProperty("--w", `${r.soundsLikePercent}%`);
  $("fill-real").style.setProperty("--w", `${r.realPercent}%`);
  $("fill-real").parentElement!.classList.toggle("narrow", r.realPercent < NAME_FITS_PERCENT);

  const steps = $<HTMLOListElement>("steps");
  steps.innerHTML = "";
  for (const s of r.steps) {
    const li = document.createElement("li");
    li.textContent = `${money(s.beforeCents)} → ${label(s.discount)} → ${money(s.afterCents)}`;
    steps.append(li);
  }

  history.replaceState(null, "", `?${writeStack(stack)}`);
}

priceInput.addEventListener("input", () => {
  state.price = priceInput.valueAsNumber;
  update();
});
currencySelect.addEventListener("change", () => {
  state.currency = currencySelect.value as Currency;
  renderRows();
  update();
});
$("add-percent").addEventListener("click", () => {
  state.rows.push({ kind: "percent", value: NEW_ROW_VALUE });
  renderRows({ index: state.rows.length - 1, what: "input" });
  update();
});
addAmount.addEventListener("click", () => {
  state.rows.push({ kind: "amount", value: NEW_ROW_VALUE });
  renderRows({ index: state.rows.length - 1, what: "input" });
  update();
});

renderRows();
update();
