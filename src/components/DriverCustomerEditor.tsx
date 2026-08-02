import { Archive, ArchiveRestore, Save, Tags } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { saveDriverCustomerAction, setDriverCustomerArchivedAction } from "@/app/motorista/clientes/actions";
import {
  DRIVER_CUSTOMER_TAG_LABELS,
  DRIVER_CUSTOMER_TAGS,
  driverCustomerName,
  type DriverCustomer,
} from "@/lib/driver-crm";

type Props = {
  customer: DriverCustomer;
};

export function DriverCustomerEditor({ customer }: Props) {
  return (
    <section className="driver-customer-editor">
      <div className="driver-customer-editor__heading">
        <div>
          <span className="eyebrow">ANOTAÇÕES PRIVADAS</span>
          <h2>Organize o relacionamento</h2>
          <p>Essas informações ficam visíveis somente no seu painel de motorista.</p>
        </div>
        <Tags size={24} />
      </div>

      <form action={saveDriverCustomerAction} className="driver-customer-editor__form">
        <input type="hidden" name="customerId" value={customer.id} />

        <label>
          <span>Nome preferido</span>
          <input
            name="customName"
            defaultValue={customer.custom_name ?? ""}
            maxLength={80}
            placeholder={driverCustomerName(customer)}
          />
          <small>Use apelido, nome da empresa ou como você prefere identificar este passageiro.</small>
        </label>

        <fieldset>
          <legend>Etiquetas</legend>
          <div className="driver-customer-tag-options">
            {DRIVER_CUSTOMER_TAGS.map((tag) => (
              <label key={tag}>
                <input type="checkbox" name="tags" value={tag} defaultChecked={customer.tags.includes(tag)} />
                <span>{DRIVER_CUSTOMER_TAG_LABELS[tag]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span>Observações</span>
          <textarea
            name="privateNotes"
            rows={7}
            maxLength={1500}
            defaultValue={customer.private_notes ?? ""}
            placeholder="Preferências, ponto de referência, forma de pagamento, necessidades especiais ou detalhes úteis para próximos atendimentos."
          />
        </label>

        <button className="button button--primary" type="submit">
          <Save size={18} /> Salvar cliente
        </button>
      </form>

      <form action={setDriverCustomerArchivedAction} className="driver-customer-archive-form">
        <input type="hidden" name="customerId" value={customer.id} />
        <input type="hidden" name="archived" value={customer.is_archived ? "false" : "true"} />
        <ConfirmSubmitButton
          className="button button--secondary"
          message={customer.is_archived
            ? "Reativar este cliente na carteira?"
            : "Arquivar este cliente? O histórico será preservado e ele poderá ser reativado depois."}
        >
          {customer.is_archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
          {customer.is_archived ? "Reativar cliente" : "Arquivar cliente"}
        </ConfirmSubmitButton>
      </form>
    </section>
  );
}
