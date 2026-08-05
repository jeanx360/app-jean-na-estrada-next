import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteHomeVisualBlockAction } from "@/app/admin/home/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

type Props = {
  blockId: string;
  blockKey: string;
  editHref?: string;
};

export function AdminHomeEditControl({ blockId, blockKey, editHref }: Props) {
  const isFallback = blockId.startsWith("default-");
  const href = editHref ?? `/admin/home?blockEdit=${encodeURIComponent(blockId)}#visual-block-form`;

  return (
    <div className="admin-home-edit-controls" aria-label={`Editar bloco ${blockKey}`}>
      <Link className="admin-home-edit-button" href={href} title="Editar este bloco" aria-label={`Editar ${blockKey}`}>
        <Pencil size={15} />
      </Link>
      {!isFallback ? (
        <form action={deleteHomeVisualBlockAction}>
          <input type="hidden" name="blockId" value={blockId} />
          <ConfirmSubmitButton
            className="admin-home-edit-button admin-home-edit-button--danger"
            message="Excluir este bloco da página inicial para todos os usuários?"
            title="Excluir este bloco"
            aria-label={`Excluir ${blockKey}`}
          >
            <Trash2 size={15} />
          </ConfirmSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
