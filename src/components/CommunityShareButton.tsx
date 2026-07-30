"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

export function CommunityShareButton({ path, title, text }: { path: string; title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  function absoluteUrl() {
    return new URL(path, window.location.origin).toString();
  }

  async function nativeShare() {
    const url = absoluteUrl();
    if (navigator.share) {
      await navigator.share({ title, text, url }).catch(() => undefined);
      return;
    }
    await copyLink();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(absoluteUrl());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function openShare(url: string) {
    window.open(url, "_blank", "noopener,noreferrer,width=720,height=650");
  }

  return (
    <details className="community-share-menu">
      <summary className="community-action-button" aria-label="Compartilhar publicação">
        <Share2 size={18} />
        <span>Compartilhar</span>
      </summary>
      <div className="community-share-menu__panel">
        <button type="button" onClick={() => void nativeShare()}><Share2 size={16} /> Compartilhar pelo aparelho</button>
        <button type="button" onClick={() => openShare(`https://wa.me/?text=${encodeURIComponent(`${title}\n${absoluteUrl()}`)}`)}>
          <Share2 size={16} /> WhatsApp
        </button>
        <button type="button" onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteUrl())}`)}>
          <Share2 size={16} /> Facebook
        </button>
        <button type="button" onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(absoluteUrl())}`)}>
          <span className="community-share-x">X</span> X
        </button>
        <button type="button" onClick={() => void copyLink()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Link copiado" : "Copiar link"}
        </button>
      </div>
    </details>
  );
}
