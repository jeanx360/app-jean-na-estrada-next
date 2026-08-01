import Image from "next/image";
import logo from "@/assets/logo-jean-na-estrada.png";

export function BrandLogo() {
  return (
    <div className="brand-logo" aria-label="Jean na Estrada">
      <Image
        src={logo}
        alt="Jean na Estrada"
        priority
        className="brand-logo__image"
        sizes="(max-width: 700px) 110px, 150px"
      />
      <div className="brand-logo__copy">
        <strong>JNE App</strong>
        <span>Conteúdo automotivo</span>
      </div>
    </div>
  );
}
