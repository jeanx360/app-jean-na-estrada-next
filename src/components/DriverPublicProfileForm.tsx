"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  ImagePlus,
  LoaderCircle,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DRIVER_AMENITIES,
  normalizeDriverSlug,
  normalizeWhatsAppPhone,
  type DriverProfileTheme,
  type DriverPublicProfile,
} from "@/lib/driver-public";

const steps = ["Identificação", "Atendimento", "Publicação"] as const;
const BANNER_BUCKET = "driver-profile-assets";
const MAX_BANNER_SIZE = 6 * 1024 * 1024;
const BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"];

const themeOptions: Array<{ id: DriverProfileTheme; label: string }> = [
  { id: "dark", label: "Preto" },
  { id: "blue", label: "Azul" },
  { id: "green", label: "Verde" },
];

type Props = {
  userId: string;
  defaultName: string;
  defaultPhotoUrl: string | null;
  initialProfile: DriverPublicProfile | null;
};

function initialSlug(name: string) {
  return normalizeDriverSlug(name) || "meu-perfil";
}

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function DriverPublicProfileForm({ userId, defaultName, defaultPhotoUrl, initialProfile }: Props) {
  const router = useRouter();
  const isFirstProfileCreation = initialProfile === null;
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? defaultName);
  const [headline, setHeadline] = useState(initialProfile?.headline ?? "Motorista particular com atendimento profissional");
  const [description, setDescription] = useState(initialProfile?.description ?? "Corridas agendadas, viagens e atendimento personalizado.");
  const [city, setCity] = useState(initialProfile?.city ?? "");
  const [serviceArea, setServiceArea] = useState(initialProfile?.service_area ?? "");
  const [whatsappPhone, setWhatsappPhone] = useState(initialProfile?.whatsapp_phone ?? "");
  const [vehicleName, setVehicleName] = useState(initialProfile?.vehicle_name ?? "");
  const [vehicleDetails, setVehicleDetails] = useState(initialProfile?.vehicle_details ?? "");
  const [seats, setSeats] = useState(String(initialProfile?.seats ?? 4));
  const [luggageNote, setLuggageNote] = useState(initialProfile?.luggage_note ?? "");
  const [availabilityNote, setAvailabilityNote] = useState(initialProfile?.availability_note ?? "Reservas mediante confirmação.");
  const [amenities, setAmenities] = useState<string[]>(initialProfile?.amenities ?? ["Ar-condicionado", "Carregador USB"]);
  const [slug, setSlug] = useState(initialProfile?.slug ?? initialSlug(defaultName));
  const [theme, setTheme] = useState<DriverProfileTheme>(initialProfile?.theme ?? "dark");
  const [published, setPublished] = useState(initialProfile?.is_published ?? false);
  const [acceptsReservations, setAcceptsReservations] = useState(initialProfile?.accepts_reservations ?? true);
  const [vehicleBannerUrl, setVehicleBannerUrl] = useState<string | null>(initialProfile?.vehicle_banner_url ?? null);
  const [vehicleBannerPath, setVehicleBannerPath] = useState<string | null>(initialProfile?.vehicle_banner_path ?? null);
  const [showVehicleBanner, setShowVehicleBanner] = useState(initialProfile?.show_vehicle_banner ?? true);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [removeStoredBanner, setRemoveStoredBanner] = useState(false);
  const [savedSlug, setSavedSlug] = useState(initialProfile?.slug ?? "");
  const [savedPublished, setSavedPublished] = useState(initialProfile?.is_published ?? false);
  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(bannerFile);
    setBannerPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [bannerFile]);

  const normalizedPhone = useMemo(() => normalizeWhatsAppPhone(whatsappPhone), [whatsappPhone]);
  const normalizedSlug = useMemo(() => normalizeDriverSlug(slug), [slug]);
  const publicHref = savedSlug ? `/m/${savedSlug}` : "#";
  const activeBannerUrl = bannerPreviewUrl || (!removeStoredBanner ? vehicleBannerUrl : null);

  function toggleAmenity(item: string) {
    setAmenities((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  }

  function chooseBanner(file: File | null) {
    setMessage(null);
    if (!file) {
      setBannerFile(null);
      return;
    }
    if (!BANNER_TYPES.includes(file.type)) {
      setMessage({ type: "error", text: "Use uma imagem JPG, PNG ou WebP." });
      return;
    }
    if (file.size > MAX_BANNER_SIZE) {
      setMessage({ type: "error", text: "A foto do carro pode ter no máximo 6 MB." });
      return;
    }
    setBannerFile(file);
    setRemoveStoredBanner(false);
    setShowVehicleBanner(true);
  }

  function removeBanner() {
    setBannerFile(null);
    setRemoveStoredBanner(true);
    setShowVehicleBanner(false);
  }

  function validateCurrentStep() {
    if (step === 0) {
      if (displayName.trim().length < 2) return "Informe o nome que será exibido para os passageiros.";
      if (!city.trim()) return "Informe sua cidade ou região principal.";
      if (normalizedPhone.length < 10) return "Informe um WhatsApp com DDD.";
    }
    if (step === 1 && !vehicleName.trim()) return "Informe o veículo usado no atendimento.";
    if (step === 2 && normalizedSlug.length < 3) return "Escolha um endereço com pelo menos 3 caracteres.";
    return null;
  }

  function nextStep() {
    const error = validateCurrentStep();
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }
    setMessage(null);
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function saveProfile() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const previousBannerPath = vehicleBannerPath;
    let uploadedPath: string | null = null;
    let nextBannerUrl = removeStoredBanner ? null : vehicleBannerUrl;
    let nextBannerPath = removeStoredBanner ? null : vehicleBannerPath;

    if (bannerFile) {
      uploadedPath = `${userId}/vehicle-${Date.now()}.${extensionFor(bannerFile)}`;
      const { error: uploadError } = await supabase.storage
        .from(BANNER_BUCKET)
        .upload(uploadedPath, bannerFile, {
          cacheControl: "3600",
          contentType: bannerFile.type,
          upsert: false,
        });

      if (uploadError) {
        setMessage({ type: "error", text: `Não foi possível enviar a foto do carro: ${uploadError.message}` });
        setSaving(false);
        return;
      }

      const { data: publicData } = supabase.storage.from(BANNER_BUCKET).getPublicUrl(uploadedPath);
      nextBannerUrl = publicData.publicUrl;
      nextBannerPath = uploadedPath;
    }

    const payload = {
      user_id: userId,
      slug: normalizedSlug,
      display_name: displayName.trim(),
      headline: headline.trim() || null,
      description: description.trim() || null,
      city: city.trim() || null,
      service_area: serviceArea.trim() || null,
      whatsapp_phone: normalizedPhone,
      vehicle_name: vehicleName.trim() || null,
      vehicle_details: vehicleDetails.trim() || null,
      seats: Math.min(20, Math.max(1, Number(seats) || 4)),
      luggage_note: luggageNote.trim() || null,
      amenities,
      availability_note: availabilityNote.trim() || null,
      photo_url: defaultPhotoUrl,
      vehicle_banner_url: nextBannerUrl,
      vehicle_banner_path: nextBannerPath,
      show_vehicle_banner: showVehicleBanner && Boolean(nextBannerUrl),
      theme,
      is_published: published,
      accepts_reservations: acceptsReservations,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("driver_public_profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (saveError) {
      if (uploadedPath) await supabase.storage.from(BANNER_BUCKET).remove([uploadedPath]);
      const duplicate = saveError.code === "23505" || saveError.message.toLowerCase().includes("duplicate");
      setMessage({
        type: "error",
        text: duplicate ? "Esse endereço já está em uso. Escolha outro." : saveError.message,
      });
      setSaving(false);
      return;
    }

    if (previousBannerPath && previousBannerPath !== nextBannerPath) {
      await supabase.storage.from(BANNER_BUCKET).remove([previousBannerPath]);
    }

    setVehicleBannerUrl(nextBannerUrl);
    setVehicleBannerPath(nextBannerPath);
    setBannerFile(null);
    setRemoveStoredBanner(false);
    setSavedSlug(normalizedSlug);
    setSavedPublished(published);

    if (isFirstProfileCreation) {
      setSaving(false);
      setRedirecting(true);
      setMessage({ type: "success", text: "Cartão do motorista salvo. Abrindo seu QR Code..." });
      window.setTimeout(() => {
        router.replace("/motorista/cartao");
      }, 1200);
      return;
    }

    setMessage({ type: "success", text: published ? "Cartão publicado com sucesso." : "Cartão salvo como rascunho." });
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="driver-profile-builder">
      <section className="driver-profile-builder__form">
        <div className="driver-stepper" aria-label="Etapas do cartão profissional">
          {steps.map((label, index) => (
            <button key={label} type="button" className={index === step ? "is-active" : index < step ? "is-complete" : ""} onClick={() => index <= step && setStep(index)}>
              <span>{index < step ? <Check size={15} /> : index + 1}</span>
              <small>{label}</small>
            </button>
          ))}
        </div>

        {step === 0 ? (
          <div className="driver-builder-step">
            <div className="driver-builder-step__heading"><span className="eyebrow">PASSO 1 DE 3</span><h2>Como o passageiro verá você</h2><p>Use informações profissionais e fáceis de reconhecer.</p></div>
            <div className="driver-field-grid">
              <label><span>Nome profissional</span><input maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ex.: Jean Vargas" /></label>
              <label><span>Cidade principal</span><input maxLength={80} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ex.: Porto Alegre e região" /></label>
              <label className="driver-field-grid__full"><span>Frase de apresentação</span><input maxLength={100} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Ex.: Motorista particular para viagens e eventos" /></label>
              <label className="driver-field-grid__full"><span>WhatsApp com DDD</span><input inputMode="tel" maxLength={20} value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value)} placeholder="Ex.: (51) 99999-9999" /><small>Para números do Brasil, o código +55 é adicionado automaticamente.</small></label>
              <label className="driver-field-grid__full"><span>Apresentação curta</span><textarea rows={4} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Conte como você atende e quais tipos de viagem realiza." /><small>{description.length}/500</small></label>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="driver-builder-step">
            <div className="driver-builder-step__heading"><span className="eyebrow">PASSO 2 DE 3</span><h2>Seu atendimento</h2><p>Mostre o veículo e apenas os detalhes que ajudam o passageiro a decidir.</p></div>
            <div className="driver-vehicle-banner-editor driver-field-grid__full">
              <div className="driver-vehicle-banner-editor__heading">
                <div><strong>Foto de destaque do carro</strong><small>A imagem aparece como banner no topo do perfil público.</small></div>
                <ImagePlus size={22} />
              </div>
              {activeBannerUrl ? <img src={activeBannerUrl} alt="Prévia do carro" /> : <div className="driver-vehicle-banner-editor__empty"><ImagePlus size={30} /><span>Adicione uma foto horizontal do veículo</span></div>}
              <div className="driver-vehicle-banner-editor__actions">
                <label className="button button--secondary button--compact"><ImagePlus size={16} /> {activeBannerUrl ? "Trocar foto" : "Escolher foto"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseBanner(event.target.files?.[0] ?? null)} /></label>
                {activeBannerUrl ? <button className="button button--secondary button--compact" type="button" onClick={removeBanner}><Trash2 size={16} /> Remover</button> : null}
              </div>
              <label className="driver-inline-toggle"><div><strong>Exibir no perfil público</strong><small>Você pode manter a foto salva e ocultá-la temporariamente.</small></div><input type="checkbox" checked={showVehicleBanner && Boolean(activeBannerUrl)} disabled={!activeBannerUrl} onChange={(event) => setShowVehicleBanner(event.target.checked)} /></label>
            </div>
            <div className="driver-field-grid">
              <label><span>Veículo</span><input maxLength={100} value={vehicleName} onChange={(event) => setVehicleName(event.target.value)} placeholder="Ex.: BYD Dolphin Plus" /></label>
              <label><span>Lugares disponíveis</span><input type="number" min={1} max={20} value={seats} onChange={(event) => setSeats(event.target.value)} /></label>
              <label className="driver-field-grid__full"><span>Detalhes do veículo</span><input maxLength={180} value={vehicleDetails} onChange={(event) => setVehicleDetails(event.target.value)} placeholder="Ex.: Elétrico, confortável e climatizado" /></label>
              <label className="driver-field-grid__full"><span>Região de atendimento</span><input maxLength={180} value={serviceArea} onChange={(event) => setServiceArea(event.target.value)} placeholder="Ex.: Grande Porto Alegre, Serra Gaúcha e litoral" /></label>
              <label><span>Bagagens</span><input maxLength={140} value={luggageNote} onChange={(event) => setLuggageNote(event.target.value)} placeholder="Ex.: Até 3 malas médias" /></label>
              <label><span>Disponibilidade</span><input maxLength={180} value={availabilityNote} onChange={(event) => setAvailabilityNote(event.target.value)} placeholder="Ex.: Reservas com 24h de antecedência" /></label>
            </div>
            <fieldset className="driver-amenities"><legend>O que você oferece</legend><div>{DRIVER_AMENITIES.map((item) => <label key={item} className={amenities.includes(item) ? "is-selected" : ""}><input type="checkbox" checked={amenities.includes(item)} onChange={() => toggleAmenity(item)} /><span>{item}</span></label>)}</div></fieldset>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="driver-builder-step">
            <div className="driver-builder-step__heading"><span className="eyebrow">PASSO 3 DE 3</span><h2>Revise e publique</h2><p>Você pode salvar como rascunho e publicar quando estiver pronto.</p></div>
            <label className="driver-slug-field"><span>Endereço do seu cartão</span><div><span>jneapp.app/m/</span><input maxLength={48} value={slug} onChange={(event) => setSlug(normalizeDriverSlug(event.target.value))} /></div><small>O QR Code continuará o mesmo enquanto esse endereço não mudar.</small></label>
            <div className="driver-theme-picker"><span>Visual do cartão</span><div>{themeOptions.map((option) => <button key={option.id} type="button" className={`${option.id === theme ? "is-selected" : ""} theme-${option.id}`} onClick={() => setTheme(option.id)}><span />{option.label}</button>)}</div><small>O tema Preto usa o mesmo preto profundo do JNE App.</small></div>
            <div className="driver-publish-options">
              <label><div><strong>Receber solicitações</strong><small>Mostra o formulário de reserva no cartão.</small></div><input type="checkbox" checked={acceptsReservations} onChange={(event) => setAcceptsReservations(event.target.checked)} /></label>
              <label><div><strong>Publicar cartão</strong><small>Deixe desligado enquanto estiver configurando.</small></div><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /></label>
            </div>
            <div className="driver-privacy-note"><ShieldCheck size={20} /><div><strong>Seus dados privados continuam protegidos</strong><p>O cartão mostra apenas as informações profissionais preenchidas aqui. E-mail, documentos, endereço residencial e dados financeiros não aparecem.</p></div></div>
          </div>
        ) : null}

        {message ? <p className={`auth-message auth-message--${message.type}`}>{message.text}</p> : null}
        <div className="driver-builder-actions">
          {step > 0 ? <button className="button button--secondary" type="button" onClick={() => { setMessage(null); setStep((current) => current - 1); }}><ArrowLeft size={18} /> Voltar</button> : <span />}
          {step < steps.length - 1 ? <button className="button button--primary" type="button" onClick={nextStep}>Continuar <ArrowRight size={18} /></button> : <button className="button button--primary" type="button" onClick={saveProfile} disabled={saving || redirecting}>{saving || redirecting ? <LoaderCircle className="auth-spinner" size={18} /> : <Save size={18} />}{redirecting ? "Abrindo QR..." : saving ? "Salvando..." : "Salvar cartão"}</button>}
        </div>
      </section>

      <aside className={`driver-profile-preview driver-profile-preview--${theme}`}>
        <div className="driver-profile-preview__top"><span>PRÉVIA</span>{savedPublished ? <a href={publicHref} target="_blank" rel="noreferrer"><Eye size={16} /> Abrir</a> : null}</div>
        {showVehicleBanner && activeBannerUrl ? <div className="driver-profile-preview__vehicle"><img src={activeBannerUrl} alt={`Veículo de ${displayName}`} /></div> : null}
        <div className={`driver-profile-preview__avatar${showVehicleBanner && activeBannerUrl ? " has-banner" : ""}`}>{defaultPhotoUrl ? <img src={defaultPhotoUrl} alt="Foto do motorista" /> : <span>{displayName.slice(0, 2).toUpperCase()}</span>}</div>
        <h3>{displayName || "Seu nome"}</h3>
        <p>{headline || "Sua apresentação profissional"}</p>
        <div className="driver-profile-preview__facts"><span>{city || "Sua cidade"}</span><span>{vehicleName || "Seu veículo"}</span><span>{Math.max(1, Number(seats) || 4)} passageiros</span></div>
        <div className="driver-profile-preview__amenities">{amenities.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
        <button type="button" disabled>Solicitar uma corrida</button>
      </aside>
    </div>
  );
}
