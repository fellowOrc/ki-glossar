export const metadata = { title: "Impressum – KI-Glossar" };

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      <p className="eyebrow mb-3">Rechtliches</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-6">Impressum</h1>
      <div className="panel p-6 sm:p-8 flex flex-col gap-5 text-sm leading-relaxed text-muted">
        <p>
          <strong className="text-foreground">Angaben gemäß § 5 TMG (Platzhalter)</strong>
          <br />
          Marcel Jäger
          <br />
          Boeckhstrasse 15
          <br />
          76137 Karlsruhe
        </p>
        <p>
          <strong className="text-foreground">Kontakt</strong>
          <br />
          E-Mail: infokiglossar@duck.com
        </p>
        <p className="text-xs">
          <strong>Haftung für Inhalte</strong>
Die Inhalte dieses KI-Glossars wurden mit größter Sorgfalt erstellt. Das Angebot dient ausschließlich informativen, nicht-kommerziellen Zwecken. Für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Informationen wird keine Gewähr übernommen.
        </p>
      </div>
    </div>
  );
}
