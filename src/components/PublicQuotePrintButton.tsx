"use client";

import { Printer } from "lucide-react";

export function PublicQuotePrintButton() {
  return <button type="button" className="button button--secondary" onClick={() => window.print()}><Printer size={17} /> Imprimir ou salvar PDF</button>;
}
