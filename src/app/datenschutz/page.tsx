export const metadata = { title: "Datenschutz – KI-Glossar" };

export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      <p className="eyebrow mb-3">Rechtliches</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-6">
        Datenschutzerklärung
      </h1>

      <div className="panel p-6 sm:p-8 flex flex-col gap-6 text-sm leading-relaxed text-muted">
        <div>
          <strong className="text-foreground block mb-1">
            1. Verantwortliche Stelle
          </strong>
          infokiglossar@duck.com
        </div>

        <div>
          <strong className="text-foreground block mb-1">
            2. Begriffsvorschläge
          </strong>
          Wenn du über das Vorschlagsformular einen Begriff einreichst,
          speichern wir den vorgeschlagenen Begriff, deine optionale Anmerkung
          und – falls angegeben – deine E-Mail-Adresse. Die E-Mail-Adresse wird
          ausschließlich für eine Rückmeldung zu diesem Vorschlag verwendet und
          nicht veröffentlicht. Zusätzlich speichern wir einen nicht
          umkehrbaren Prüfwert deiner IP-Adresse, um massenhaftes automatisiertes
          Einsenden zu unterbinden; die IP-Adresse selbst wird nicht gespeichert.
          Rechtsgrundlage ist unser berechtigtes Interesse an einem
          funktionsfähigen, missbrauchssicheren Informationsangebot.
        </div>

        <div>
          <strong className="text-foreground block mb-1">
            4. Hosting und Auftragsverarbeitung
          </strong>
          Diese Anwendung wird bei Vercel Inc. gehostet, die Datenbank bei
          Supabase Inc. Beide Anbieter können Daten in der EU oder den USA
          verarbeiten. Für die Recherche neuer Begriffe wird der Dienst von
          Anthropic PBC eingesetzt; dabei werden ausschließlich der Begriff und
          der daraus erzeugte Entwurfstext übermittelt, keine personenbezogenen
          Daten von Besuchern.
        </div>

        <div>
          <strong className="text-foreground block mb-1">
            5. Deine Rechte
          </strong>
          Du kannst Auskunft, Berichtigung und Löschung der zu dir gespeicherten
          Daten verlangen. Für Vorschläge genügt eine formlose Nachricht an die
          oben genannte Adresse.
        </div>
      </div>
    </div>
  );
}
