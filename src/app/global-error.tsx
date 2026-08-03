"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Segoe UI, sans-serif", background: "#050505", color: "#fff" }}>
          <div style={{ width: "min(100%, 560px)", padding: 28, border: "1px solid #ffffff1a", borderRadius: 22, textAlign: "center", background: "#121212" }}>
            <small style={{ color: "#38bdf8", fontWeight: 800, letterSpacing: ".12em" }}>JNE APP</small>
            <h1>O aplicativo encontrou um erro</h1>
            <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>Recarregue a aplicação. Caso não resolva, abra novamente pelo endereço oficial jneapp.app.</p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
              <button onClick={reset} style={{ padding: "12px 18px", borderRadius: 12, border: 0, cursor: "pointer", fontWeight: 800 }}>Recarregar</button>
              <a href="/suporte" style={{ padding: "12px 18px", border: "1px solid #ffffff22", borderRadius: 12, color: "#fff", textDecoration: "none", fontWeight: 800 }}>Central de Ajuda</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
