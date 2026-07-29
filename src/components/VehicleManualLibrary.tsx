"use client";

import {
  BookOpenText,
  Download,
  FileCog,
  FileText,
  Languages,
  LockKeyhole,
  SearchX,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  VehicleDocumentRow,
  VehicleDocumentType,
  VehicleLibraryBrand,
} from "@/types/vehicle-library";

const documentLabels: Record<VehicleDocumentType, string> = {
  owner: "Manual do proprietário",
  maintenance: "Manual de manutenção",
  warranty: "Garantia",
  multimedia: "Multimídia",
  "quick-guide": "Guia rápido",
  technical: "Documento técnico",
  other: "Outro documento",
};

function DocumentIcon({ type }: { type: VehicleDocumentType }) {
  if (type === "maintenance" || type === "technical") return <Wrench size={21} />;
  if (type === "warranty") return <ShieldCheck size={21} />;
  if (type === "multimedia") return <FileCog size={21} />;
  if (type === "owner" || type === "quick-guide") return <BookOpenText size={21} />;
  return <FileText size={21} />;
}

function formatFileSize(value: number | null) {
  if (!value || value < 1) return null;
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function documentHref(document: VehicleDocumentRow) {
  return `/api/manuais/download?id=${encodeURIComponent(document.id)}`;
}

type Props = {
  brands: VehicleLibraryBrand[];
  canAccessVip: boolean;
};

export function VehicleManualLibrary({ brands, canAccessVip }: Props) {
  const firstBrand = brands[0];
  const [brandId, setBrandId] = useState(firstBrand?.id ?? "");
  const initialModel = firstBrand?.models[0];
  const [modelId, setModelId] = useState(initialModel?.id ?? "");
  const initialYear = initialModel?.documents.flatMap((item) => item.years).sort((a, b) => b - a)[0];
  const [year, setYear] = useState(initialYear ? String(initialYear) : "");

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === brandId) ?? brands[0],
    [brandId, brands],
  );
  const models = selectedBrand?.models ?? [];
  const selectedModel = useMemo(
    () => models.find((model) => model.id === modelId) ?? models[0],
    [modelId, models],
  );
  const years = useMemo(
    () => Array.from(new Set((selectedModel?.documents ?? []).flatMap((item) => item.years))).sort((a, b) => b - a),
    [selectedModel],
  );
  const selectedYear = year && years.includes(Number(year)) ? Number(year) : years[0];
  const documents = useMemo(
    () => (selectedModel?.documents ?? []).filter((document) => !selectedYear || document.years.includes(selectedYear)),
    [selectedModel, selectedYear],
  );

  function changeBrand(nextBrandId: string) {
    const nextBrand = brands.find((brand) => brand.id === nextBrandId);
    const nextModel = nextBrand?.models[0];
    const nextYear = nextModel?.documents.flatMap((item) => item.years).sort((a, b) => b - a)[0];
    setBrandId(nextBrandId);
    setModelId(nextModel?.id ?? "");
    setYear(nextYear ? String(nextYear) : "");
  }

  function changeModel(nextModelId: string) {
    const nextModel = models.find((model) => model.id === nextModelId);
    const nextYear = nextModel?.documents.flatMap((item) => item.years).sort((a, b) => b - a)[0];
    setModelId(nextModelId);
    setYear(nextYear ? String(nextYear) : "");
  }

  if (!brands.length) {
    return (
      <div className="manual-library-empty">
        <SearchX size={30} />
        <strong>A biblioteca está sendo preparada.</strong>
        <p>Os primeiros veículos e documentos aparecerão aqui assim que forem publicados pelo administrador.</p>
      </div>
    );
  }

  return (
    <div className="manual-library">
      <div className="manual-library__filters">
        <label>
          <span>Marca</span>
          <select value={selectedBrand?.id ?? ""} onChange={(event) => changeBrand(event.target.value)}>
            {brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}
          </select>
        </label>
        <label>
          <span>Veículo</span>
          <select value={selectedModel?.id ?? ""} onChange={(event) => changeModel(event.target.value)}>
            {models.map((model) => <option value={model.id} key={model.id}>{model.name}</option>)}
          </select>
        </label>
        <label>
          <span>Ano/modelo</span>
          <select value={selectedYear ? String(selectedYear) : ""} onChange={(event) => setYear(event.target.value)}>
            {years.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="manual-library__summary">
        <div>
          <span>DOCUMENTAÇÃO DISPONÍVEL</span>
          <h3>{selectedBrand?.name} {selectedModel?.name} {selectedYear ? `— ${selectedYear}` : ""}</h3>
        </div>
        <strong>{documents.length}</strong>
      </div>

      <div className="manual-document-grid">
        {documents.map((document) => {
          const locked = document.access_level === "vip" && !canAccessVip;
          const size = formatFileSize(document.file_size);
          return (
            <article className="manual-document-card" key={document.id}>
              <div className="manual-document-card__icon"><DocumentIcon type={document.document_type} /></div>
              <div className="manual-document-card__body">
                <div className="manual-document-card__badges">
                  <span>{documentLabels[document.document_type]}</span>
                  {document.access_level === "vip" ? <span className="status-pill status-pill--vip">VIP</span> : <span className="status-pill">Público</span>}
                </div>
                <h3>{document.title}</h3>
                <p>{document.description || "Documento disponibilizado na biblioteca do JNE App."}</p>
                <div className="manual-document-card__meta">
                  <span><Languages size={14} /> {document.language}</span>
                  {document.source_name ? <span>Fonte: {document.source_name}</span> : null}
                  {size ? <span>{size}</span> : null}
                </div>
              </div>
              {locked ? (
                <a className="button button--secondary" href="/membros">
                  <LockKeyhole size={17} /> Acesso VIP
                </a>
              ) : (
                <a className="button button--primary" href={documentHref(document)} target="_blank" rel="noreferrer">
                  <Download size={17} /> Abrir documento
                </a>
              )}
            </article>
          );
        })}
        {!documents.length ? (
          <div className="manual-library-empty manual-library-empty--compact">
            <SearchX size={25} />
            <strong>Nenhum documento para este ano.</strong>
            <p>Selecione outro ano ou aguarde a próxima atualização da biblioteca.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
