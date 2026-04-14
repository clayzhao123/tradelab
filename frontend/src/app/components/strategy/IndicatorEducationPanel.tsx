import { useMemo } from "react";
import { type IndicatorDefinition } from "../../constants/indicatorCatalog";
import { getIndicatorGuide } from "../../constants/indicatorGuides";
import { IndicatorCandleGuideChart } from "./IndicatorCandleGuideChart";

type IndicatorEducationPanelProps = {
  indicator: IndicatorDefinition;
};

export function IndicatorEducationPanel({ indicator }: IndicatorEducationPanelProps) {
  const guide = useMemo(() => getIndicatorGuide(indicator), [indicator]);

  return (
    <div className="rounded-xl border border-border-subtle bg-elevated p-4">
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[14px] font-semibold text-tx-primary">{indicator.name} 详细讲解</h3>
          <span className="rounded-full border border-border-subtle bg-page px-2 py-0.5 text-[10px] text-tx-tertiary">
            {indicator.description}
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-tx-secondary">{guide.coreConcept}</p>
      </div>

      <div className="mb-3">
        <IndicatorCandleGuideChart mode={guide.chartMode} />
        <div className="mt-2 rounded-md bg-page px-2.5 py-2 text-[11px] text-tx-secondary">{guide.chartHint}</div>
      </div>

      <div className="space-y-3 text-[12px] text-tx-secondary">
        <section>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-tx-tertiary">公式速览</div>
          <div className="rounded-md border border-border-subtle bg-page px-2.5 py-2 font-mono text-[11px] text-tx-primary">
            {guide.formula}
          </div>
        </section>

        <section>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-tx-tertiary">怎么读信号</div>
          <ul className="space-y-1">
            {guide.readMethod.map((line) => (
              <li key={`${indicator.id}-read-${line}`} className="leading-relaxed">
                • {line}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-tx-tertiary">实战流程</div>
          <ul className="space-y-1">
            {guide.practicalWorkflow.map((line) => (
              <li key={`${indicator.id}-workflow-${line}`} className="leading-relaxed">
                • {line}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-tx-tertiary">风险提醒</div>
          <ul className="space-y-1">
            {guide.caution.map((line) => (
              <li key={`${indicator.id}-caution-${line}`} className="leading-relaxed text-[11px] text-tx-tertiary">
                • {line}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
