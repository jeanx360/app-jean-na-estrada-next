"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="pt-BR"><body><main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:"24px",fontFamily:"sans-serif",background:"#050505",color:"#fff"}}><div style={{maxWidth:560,textAlign:"center"}}><h1>O JNE App encontrou um erro</h1><p>Recarregue a aplicação para tentar recuperar a sessão.</p><button onClick={reset} style={{padding:"12px 18px",borderRadius:12,border:0,cursor:"pointer"}}>Recarregar</button></div></main></body></html>;
}
