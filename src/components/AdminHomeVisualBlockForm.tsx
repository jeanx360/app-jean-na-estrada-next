"use client";

import { LayoutDashboard, Save } from "lucide-react";
import { useActionState } from "react";
import { saveHomeVisualBlockAction } from "@/app/admin/home/actions";
import type {
  HomeVisualBlockActionState,
  HomeVisualBlockRow,
} from "@/types/home-visual-block";

const initialState: HomeVisualBlockActionState = {};

type Props = { initialData?: HomeVisualBlockRow | null };

export function AdminHomeVisualBlockForm({ initialData }: Props) {
  const [state, action, pending] = useActionState(saveHomeVisualBlockAction, initialState);

  return (
    <form className="admin-form" action={action} id="visual-block-form">
      <input type="hidden" name="blockId" value={initialData?.id ?? ""} />

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Identificador do bloco</span>
          <input
            name="blockKey"
            required
            maxLength={80}
            pattern="[a-z0-9_\-]+"
            readOnly={Boolean(initialData)}
            defaultValue={initialData?.block_key ?? ""}
            placeholder="ex.: destaque_novo"
          />
        </label>
        <label>
          <span>Tipo visual</span>
          <select name="blockType" defaultValue={initialData?.block_type ?? "cta"}>
            <option value="carousel">Carrossel</option>
            <option value="cta">Chamada com botões</option>
            <option value="utility">Cartão de ferramenta</option>
            <option value="quick_access">Seção de acesso rápido</option>
            <option value="videos">Seção de vídeos</option>
            <option value="trust">Cartão de confiança</option>
          </select>
        </label>
      </div>

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Variação</span>
          <select name="variant" defaultValue={initialData?.variant ?? "default"}>
            <option value="default">Padrão</option>
            <option value="commercial">Chamada comercial</option>
            <option value="community">Comunidade</option>
            <option value="ev">Elétrico</option>
            <option value="driver">Motorista</option>
          </select>
        </label>
        <label>
          <span>Ordem</span>
          <input name="sortOrder" type="number" min="0" max="100000" defaultValue={initialData?.sort_order ?? 100} />
        </label>
      </div>

      <label>
        <span>Etiqueta superior</span>
        <input name="eyebrow" maxLength={70} defaultValue={initialData?.eyebrow ?? ""} placeholder="Ex.: ACESSO RÁPIDO" />
      </label>

      <label>
        <span>Título</span>
        <input name="title" maxLength={160} defaultValue={initialData?.title ?? ""} placeholder="Título principal do bloco" />
      </label>

      <label>
        <span>Descrição</span>
        <textarea name="description" rows={3} maxLength={500} defaultValue={initialData?.description ?? ""} placeholder="Texto de apoio do bloco." />
      </label>

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Texto do botão principal</span>
          <input name="actionLabel" maxLength={60} defaultValue={initialData?.action_label ?? ""} />
        </label>
        <label>
          <span>Destino principal</span>
          <input name="actionUrl" defaultValue={initialData?.action_url ?? ""} placeholder="/pagina ou https://..." />
        </label>
      </div>

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Texto do botão secundário</span>
          <input name="secondaryActionLabel" maxLength={60} defaultValue={initialData?.secondary_action_label ?? ""} />
        </label>
        <label>
          <span>Destino secundário</span>
          <input name="secondaryActionUrl" defaultValue={initialData?.secondary_action_url ?? ""} placeholder="/pagina ou https://..." />
        </label>
      </div>

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Ícone</span>
          <select name="icon" defaultValue={initialData?.icon ?? "sparkles"}>
            <option value="sparkles">Destaque</option>
            <option value="handshake">Parceiros</option>
            <option value="battery">Bateria</option>
            <option value="calculator">Calculadora</option>
            <option value="route">Rota</option>
            <option value="check">Confirmação</option>
            <option value="videos">Vídeos</option>
            <option value="grid">Grade</option>
          </select>
        </label>
        <label>
          <span>Cor</span>
          <select name="accent" defaultValue={initialData?.accent ?? "blue"}>
            <option value="blue">Azul</option>
            <option value="cyan">Ciano</option>
            <option value="orange">Laranja</option>
            <option value="violet">Violeta</option>
            <option value="green">Verde</option>
          </select>
        </label>
      </div>

      <label className="admin-checkbox">
        <input name="isPublished" type="checkbox" defaultChecked={initialData?.is_published ?? true} />
        <span>Exibir este bloco para todos os usuários</span>
      </label>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}

      <div className="admin-inline-actions">
        <button className="button button--primary" type="submit" disabled={pending}>
          <Save size={18} /> {pending ? "Salvando..." : initialData ? "Salvar bloco" : "Criar bloco"}
        </button>
        {initialData ? (
          <a className="button button--secondary" href="/admin/home#visual-block-form">
            <LayoutDashboard size={17} /> Criar outro
          </a>
        ) : null}
      </div>
    </form>
  );
}
