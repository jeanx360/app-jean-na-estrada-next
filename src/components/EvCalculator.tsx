"use client";

import { Calculator, RotateCcw, TrendingDown, Zap } from "lucide-react";
import { useMemo, useState } from "react";

type CalculatorValues = {
  monthlyKm: number;
  years: number;
  fuelEfficiency: number;
  fuelPrice: number;
  fuelMaintenance: number;
  evEfficiency: number;
  energyPrice: number;
  evMaintenance: number;
  fuelVehiclePrice: number;
  evVehiclePrice: number;
};

type CalculatorInputs = Record<keyof CalculatorValues, string>;

const initialInputs: CalculatorInputs = {
  monthlyKm: "1500",
  years: "5",
  fuelEfficiency: "10",
  fuelPrice: "6,5",
  fuelMaintenance: "2500",
  evEfficiency: "6,5",
  energyPrice: "0,85",
  evMaintenance: "500",
  fuelVehiclePrice: "120000",
  evVehiclePrice: "140000",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

function parseInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function acceptsNumericInput(value: string) {
  return /^\d*(?:[.,]\d*)?$/.test(value);
}

export function EvCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);

  const values = useMemo<CalculatorValues>(() => ({
    monthlyKm: parseInput(inputs.monthlyKm),
    years: parseInput(inputs.years),
    fuelEfficiency: parseInput(inputs.fuelEfficiency),
    fuelPrice: parseInput(inputs.fuelPrice),
    fuelMaintenance: parseInput(inputs.fuelMaintenance),
    evEfficiency: parseInput(inputs.evEfficiency),
    energyPrice: parseInput(inputs.energyPrice),
    evMaintenance: parseInput(inputs.evMaintenance),
    fuelVehiclePrice: parseInput(inputs.fuelVehiclePrice),
    evVehiclePrice: parseInput(inputs.evVehiclePrice),
  }), [inputs]);

  const results = useMemo(() => {
    const monthlyKm = values.monthlyKm;
    const years = values.years;
    const fuelEfficiency = values.fuelEfficiency;
    const evEfficiency = values.evEfficiency;

    const fuelMonthlyEnergy = fuelEfficiency
      ? (monthlyKm / fuelEfficiency) * values.fuelPrice
      : 0;
    const evMonthlyEnergy = evEfficiency
      ? (monthlyKm / evEfficiency) * values.energyPrice
      : 0;

    const fuelMonthlyOperation = fuelMonthlyEnergy + values.fuelMaintenance / 12;
    const evMonthlyOperation = evMonthlyEnergy + values.evMaintenance / 12;
    const monthlySavings = fuelMonthlyOperation - evMonthlyOperation;
    const yearlySavings = monthlySavings * 12;

    const fuelTotal =
      values.fuelVehiclePrice +
      fuelMonthlyEnergy * 12 * years +
      values.fuelMaintenance * years;
    const evTotal =
      values.evVehiclePrice +
      evMonthlyEnergy * 12 * years +
      values.evMaintenance * years;

    const purchaseDifference = values.evVehiclePrice - values.fuelVehiclePrice;
    const breakEvenMonths =
      purchaseDifference > 0 && monthlySavings > 0
        ? purchaseDifference / monthlySavings
        : 0;

    return {
      fuelMonthlyOperation,
      evMonthlyOperation,
      monthlySavings,
      yearlySavings,
      fuelTotal,
      evTotal,
      totalSavings: fuelTotal - evTotal,
      fuelCostPerKm: monthlyKm ? fuelMonthlyOperation / monthlyKm : 0,
      evCostPerKm: monthlyKm ? evMonthlyOperation / monthlyKm : 0,
      breakEvenMonths,
    };
  }, [values]);

  function updateInput(field: keyof CalculatorInputs, rawValue: string) {
    if (!acceptsNumericInput(rawValue)) return;

    setInputs((current) => ({
      ...current,
      [field]: rawValue,
    }));
  }

  const fields: Array<{
    field: keyof CalculatorInputs;
    label: string;
    decimal?: boolean;
    group: "Uso" | "Combustão" | "Elétrico" | "Compra";
  }> = [
    { field: "monthlyKm", label: "Km rodados por mês", group: "Uso" },
    { field: "years", label: "Anos considerados", group: "Uso" },
    { field: "fuelEfficiency", label: "Consumo (km/L)", group: "Combustão", decimal: true },
    { field: "fuelPrice", label: "Combustível (R$/L)", group: "Combustão", decimal: true },
    { field: "fuelMaintenance", label: "Manutenção anual (R$)", group: "Combustão" },
    { field: "evEfficiency", label: "Consumo (km/kWh)", group: "Elétrico", decimal: true },
    { field: "energyPrice", label: "Energia (R$/kWh)", group: "Elétrico", decimal: true },
    { field: "evMaintenance", label: "Manutenção anual (R$)", group: "Elétrico" },
    { field: "fuelVehiclePrice", label: "Preço do carro a combustão", group: "Compra" },
    { field: "evVehiclePrice", label: "Preço do carro elétrico", group: "Compra" },
  ];

  const groups = ["Uso", "Combustão", "Elétrico", "Compra"] as const;

  return (
    <div className="calculator-layout">
      <section className="calculator-panel">
        <div className="calculator-panel__heading">
          <div>
            <span>SEUS DADOS</span>
            <h2>Monte uma comparação personalizada</h2>
          </div>
          <button
            className="button button--secondary calculator-reset"
            type="button"
            onClick={() => setInputs(initialInputs)}
          >
            <RotateCcw size={16} />
            Restaurar exemplo
          </button>
        </div>

        <div className="calculator-groups">
          {groups.map((group) => (
            <fieldset className="calculator-group" key={group}>
              <legend>{group}</legend>
              <div className="calculator-fields">
                {fields
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <label className="calculator-field" key={item.field}>
                      <span>{item.label}</span>
                      <input
                        type="text"
                        inputMode={item.decimal ? "decimal" : "numeric"}
                        autoComplete="off"
                        value={inputs[item.field]}
                        onChange={(event) => updateInput(item.field, event.target.value)}
                        aria-label={item.label}
                      />
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="calculator-results" aria-live="polite">
        <div className="calculator-result calculator-result--primary">
          <TrendingDown size={24} />
          <span>Economia operacional estimada</span>
          <strong>{currency.format(results.monthlySavings)}</strong>
          <small>por mês</small>
        </div>

        <div className="calculator-result-grid">
          <article className="calculator-result">
            <span>Elétrico por mês</span>
            <strong>{currency.format(results.evMonthlyOperation)}</strong>
            <small>{currency.format(results.evCostPerKm)} por km</small>
          </article>
          <article className="calculator-result">
            <span>Combustão por mês</span>
            <strong>{currency.format(results.fuelMonthlyOperation)}</strong>
            <small>{currency.format(results.fuelCostPerKm)} por km</small>
          </article>
          <article className="calculator-result">
            <span>Economia anual</span>
            <strong>{currency.format(results.yearlySavings)}</strong>
            <small>energia, combustível e manutenção</small>
          </article>
          <article className="calculator-result">
            <span>Diferença no período</span>
            <strong>{currency.format(results.totalSavings)}</strong>
            <small>incluindo o preço dos veículos</small>
          </article>
        </div>

        <div className="calculator-comparison">
          <div>
            <span><Zap size={16} /> Elétrico no período</span>
            <strong>{currency.format(results.evTotal)}</strong>
          </div>
          <div>
            <span><Calculator size={16} /> Combustão no período</span>
            <strong>{currency.format(results.fuelTotal)}</strong>
          </div>
        </div>

        <div className="calculator-note">
          <strong>
            {results.breakEvenMonths > 0
              ? `Diferença inicial recuperada em aproximadamente ${number.format(results.breakEvenMonths)} meses.`
              : "O retorno do valor inicial depende dos dados informados."}
          </strong>
          <p>
            Esta ferramenta apresenta uma estimativa. Seguro, financiamento, impostos, pneus, depreciação e condições reais de uso podem alterar o resultado.
          </p>
        </div>
      </section>
    </div>
  );
}
