"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  effectivePrice,
  formatUsd,
  getPromptOutput,
  getTokenModel,
  roughTokenEstimate,
  textInputCost,
  TOKEN_MODELS,
  type ImageSpec,
  type PromptView,
  type TokenModel,
} from "@/domain";
import { fmt, type Messages } from "@/i18n/messages";

type Counter = (text: string) => number;
let counter: Counter | null = null;
let loading: Promise<Counter> | null = null;
/** The o200k_base tokenizer (~2 MB) is loaded on first use, never with the page. Local only. */
const loadCounter = (): Promise<Counter> =>
  (loading ??= import("gpt-tokenizer/encoding/o200k_base").then((m) => {
    counter = m.countTokens as Counter;
    return counter;
  }));

const useTokenCounter = (): Counter | null => {
  const [c, setC] = useState<Counter | null>(() => counter);
  useEffect(() => {
    if (c) return;
    let alive = true;
    loadCounter().then(
      (f) => alive && setC(() => f),
      () => undefined, // stays on the rough estimate
    );
    return () => {
      alive = false;
    };
  }, [c]);
  return c;
};

export interface TokenPrefs {
  tokenModel: string;
  setTokenModel(id: string): void;
  tokenPrices: Record<string, number>;
  setTokenPrice(modelId: string, price: number | null): void;
}

/**
 * Prompt length and text-input cost (Sprint 2-D.7). Counts follow the prompt actually shown (the selected
 * detail level). Blocked or empty output → no prompt, so nothing is counted.
 */
export function PromptStats({ view, spec, prefs, locale, t }: { view: PromptView; spec: ImageSpec; prefs: TokenPrefs; locale: string; t: Messages }) {
  const k = t.tokens;
  const out = getPromptOutput(view);
  const text = out.ok ? out.prompt : "";
  const count = useTokenCounter();
  const tokens = useMemo(() => (count ? count(text) : roughTokenEstimate(text)), [count, text]);
  const model = getTokenModel(prefs.tokenModel);
  const exact = Boolean(count) && model.tokenizer !== null;
  const price = effectivePrice(model, prefs.tokenPrices);
  const outputAttrs = new Set([...view.fragments.map((f) => f.attributeId), ...Object.values(view.parameterSources)]).size;
  const nf = new Intl.NumberFormat(locale);
  const modelId = useId();

  return (
    <section className="stats" aria-labelledby={`${modelId}-title`} data-testid="prompt-stats">
      <h3 id={`${modelId}-title`} className="stats__title">
        {k.title}
      </h3>
      <dl className="stats__grid">
        <div>
          <dt>{k.attributes}</dt>
          <dd data-testid="stat-attributes">{nf.format(Object.keys(spec.selections).length)}</dd>
        </div>
        <div>
          <dt>{k.output}</dt>
          <dd data-testid="stat-output">{nf.format(out.ok ? outputAttrs : 0)}</dd>
        </div>
        <div>
          <dt>{k.chars}</dt>
          <dd data-testid="stat-chars">{nf.format(text.length)}</dd>
        </div>
        <div>
          <dt>{k.tokens}</dt>
          <dd data-testid="stat-tokens">
            {exact ? "" : "≈ "}
            {nf.format(tokens)}
            <span className="muted small">
              {" "}
              ({!count ? k.loading : exact ? fmt(k.counted, { tokenizer: model.tokenizer! }) : k.estimate})
            </span>
          </dd>
        </div>
        <div>
          <dt>
            {k.cost} <span className="stats__hint">{k.costShort}</span>
          </dt>
          <dd data-testid="stat-cost">{price ? `${exact ? "" : "≈ "}${formatUsd(textInputCost(tokens, price.usdPerMillion))}` : "—"}</dd>
        </div>
      </dl>
      {!price && (
        <p className="muted small" data-testid="no-price">
          {k.noPrice}
        </p>
      )}
      <details className="stats__settings">
        <summary className="small">
          {k.settings}: {model.label}
          {price ? ` · ${fmt(k.perMillion, { usd: String(price.usdPerMillion) })}` : ""}
        </summary>
        <div className="stats__model">
          <label htmlFor={modelId}>{k.model}</label>
          <select id={modelId} value={model.id} onChange={(e) => prefs.setTokenModel(e.target.value)} data-testid="token-model">
            {TOKEN_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <PriceField key={model.id} model={model} prefs={prefs} t={t} />
        </div>
        {model.tokenizer === null && <p className="muted small">{k.estimateNote}</p>}
        <p className="muted small">{k.costNote}</p>
      </details>
    </section>
  );
}

function PriceField({ model, prefs, t }: { model: TokenModel; prefs: TokenPrefs; t: Messages }) {
  const k = t.tokens;
  const own = prefs.tokenPrices[model.id];
  const [text, setText] = useState(own !== undefined ? String(own) : model.price ? String(model.price.usdPerMillion) : "");
  const id = useId();
  const onChange = (v: string) => {
    setText(v);
    const n = Number(v);
    if (v.trim() === "") prefs.setTokenPrice(model.id, null);
    else if (Number.isFinite(n) && n >= 0) prefs.setTokenPrice(model.id, n);
  };
  return (
    <>
      <label htmlFor={id}>{k.price}</label>
      <input
        id={id}
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={text}
        placeholder={k.pricePlaceholder}
        onChange={(e) => onChange(e.target.value)}
        data-testid="token-price"
      />
      <span className="muted small" data-testid="price-source">
        {own !== undefined ? (
          <>
            {k.priceUser}
            {model.price && (
              <>
                {" · "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    prefs.setTokenPrice(model.id, null);
                    setText(String(model.price!.usdPerMillion));
                  }}
                >
                  {k.priceReset}
                </button>
              </>
            )}
          </>
        ) : model.price ? (
          <a href={model.price.source} target="_blank" rel="noreferrer noopener">
            {fmt(k.priceSource, { date: model.price.checkedAt })}
          </a>
        ) : null}
      </span>
    </>
  );
}
