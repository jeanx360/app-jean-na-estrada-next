"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Car, Home, LoaderCircle, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MemberProfile, PreferredHome } from "@/types/auth";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function ProfileEditor({ profile, email }: { profile: MemberProfile; email: string | null }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [avatarPath, setAvatarPath] = useState(profile.avatar_path);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [professionalDriver, setProfessionalDriver] = useState(profile.is_professional_driver);
  const [preferredHome, setPreferredHome] = useState<PreferredHome>(profile.preferred_home ?? "standard");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function saveProfile() {
    const normalizedName = fullName.trim();
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      setMessage({ type: "error", text: "O nome precisa ter entre 2 e 80 caracteres." });
      return;
    }
    if (bio.trim().length > 280) {
      setMessage({ type: "error", text: "A apresentação pode ter no máximo 280 caracteres." });
      return;
    }

    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    let nextAvatarUrl = avatarUrl;
    let nextAvatarPath = avatarPath;
    let uploadedPath: string | null = null;

    try {
      if (selectedFile) {
        const extension = ALLOWED_TYPES.get(selectedFile.type);
        if (!extension) throw new Error("Use uma imagem JPG, PNG ou WebP.");
        if (selectedFile.size > MAX_AVATAR_SIZE) throw new Error("A imagem deve ter no máximo 2 MB.");

        uploadedPath = `${profile.id}/avatar-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(uploadedPath, selectedFile, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(uploadedPath);
        nextAvatarUrl = data.publicUrl;
        nextAvatarPath = uploadedPath;
      }

      const { error: profileError } = await supabase.rpc("update_own_profile", {
        new_full_name: normalizedName,
        new_bio: bio.trim() || null,
        new_avatar_url: nextAvatarUrl,
        new_avatar_path: nextAvatarPath,
      });
      if (profileError) throw profileError;

      const safePreferredHome: PreferredHome = professionalDriver ? preferredHome : "standard";
      const { error: driverError } = await supabase.rpc("update_driver_profile_preferences", {
        new_is_professional_driver: professionalDriver,
        new_preferred_home: safePreferredHome,
      });
      if (driverError) throw driverError;

      if (uploadedPath && avatarPath && avatarPath !== uploadedPath) {
        await supabase.storage.from("avatars").remove([avatarPath]);
      }

      setAvatarUrl(nextAvatarUrl);
      setAvatarPath(nextAvatarPath);
      setPreferredHome(safePreferredHome);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setMessage({ type: "success", text: "Perfil e preferências atualizados." });
      router.refresh();
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("avatars").remove([uploadedPath]);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível atualizar o perfil." });
    } finally {
      setSaving(false);
    }
  }

  async function removeAvatar() {
    if (!avatarPath) return;
    if (!window.confirm("Remover a foto do perfil?")) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("update_own_profile", {
      new_full_name: fullName.trim(),
      new_bio: bio.trim() || null,
      new_avatar_url: null,
      new_avatar_path: null,
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setSaving(false);
      return;
    }
    await supabase.storage.from("avatars").remove([avatarPath]);
    setAvatarUrl(null);
    setAvatarPath(null);
    setSelectedFile(null);
    setSaving(false);
    setMessage({ type: "success", text: "Foto removida." });
    router.refresh();
  }

  const initials = (fullName || email || "JN").slice(0, 2).toUpperCase();

  return (
    <section className="profile-editor">
      <div className="profile-editor__avatar-column">
        <div className="profile-editor__avatar">
          {avatarUrl ? <img src={avatarUrl} alt="Foto do perfil" /> : <span>{initials}</span>}
        </div>
        <label className="button button--secondary profile-editor__upload">
          <Camera size={17} /> Escolher foto
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {selectedFile ? <small>{selectedFile.name}</small> : null}
        {avatarPath ? (
          <button className="button button--ghost" type="button" onClick={removeAvatar} disabled={saving}>
            <Trash2 size={16} /> Remover foto
          </button>
        ) : null}
      </div>

      <div className="profile-editor__fields">
        <label><span>Nome</span><input value={fullName} maxLength={80} onChange={(event) => setFullName(event.target.value)} /></label>
        <label><span>E-mail</span><input value={email ?? ""} disabled /></label>
        <label><span>Sobre você</span><textarea value={bio} maxLength={280} rows={5} onChange={(event) => setBio(event.target.value)} placeholder="Conte brevemente sua relação com carros e tecnologia." /><small>{bio.length}/280</small></label>

        <div className="driver-profile-preferences">
          <div className="driver-profile-preferences__heading">
            <Car size={21} />
            <div>
              <strong>Motorista profissional</strong>
              <p>Ative para usar orçamento de viagens, histórico e um painel mais rápido ao abrir o app.</p>
            </div>
          </div>

          <label className="driver-toggle-row">
            <span>Sou motorista profissional</span>
            <input
              type="checkbox"
              checked={professionalDriver}
              onChange={(event) => {
                const checked = event.target.checked;
                setProfessionalDriver(checked);
                setPreferredHome(checked ? "driver" : "standard");
              }}
            />
          </label>

          {professionalDriver ? (
            <div className="driver-home-choice">
              <span><Home size={17} /> Qual tela abrir primeiro?</span>
              <label>
                <input type="radio" name="preferred-home" checked={preferredHome === "driver"} onChange={() => setPreferredHome("driver")} />
                Painel do motorista
              </label>
              <label>
                <input type="radio" name="preferred-home" checked={preferredHome === "standard"} onChange={() => setPreferredHome("standard")} />
                Conteúdo Jean na Estrada
              </label>
            </div>
          ) : null}
        </div>

        {message ? <p className={`auth-message auth-message--${message.type}`}>{message.text}</p> : null}
        <button className="button button--primary" type="button" onClick={saveProfile} disabled={saving}>
          {saving ? <LoaderCircle className="auth-spinner" size={18} /> : <Save size={18} />}
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
      </div>
    </section>
  );
}
