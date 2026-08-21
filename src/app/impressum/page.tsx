export const metadata = { title: "Impressum – KI-Glossar" };

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      <p className="eyebrow mb-3">Rechtliches</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-6">Impressum</h1>
      <div className="panel p-6 sm:p-8 flex flex-col gap-5 text-sm leading-relaxed text-muted">
        <p>
          <strong className="text-foreground">
            Angaben gemäß § 5 TMG (Platzhalter)
          </strong>
          <br />
          [Firmenname]
          <br />
          [Straße, Hausnummer]
          <br />
          [PLZ, Ort]
        </p>
        <p>
          <strong className="text-foreground">Kontakt</strong>
          <br />
          Telefon: [Telefonnummer]
          <br />
          E-Mail: [E-Mail-Adresse]
        </p>
        <p>
          <strong className="text-foreground">
            Vertretungsberechtigt / Registereintrag
          </strong>
          <br />
          [Name der vertretungsberechtigten Person]
          <br />
          [Registergericht, Registernummer, USt-IdNr.]
        </p>
        <p className="text-xs">
          Dies ist ein Platzhalter-Impressum und muss vor Veröffentlichung
          durch die tatsächlichen rechtlich erforderlichen Angaben ersetzt
          werden.
        </p>
      </div>
    </div>
  );
}
