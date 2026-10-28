# Historique des versions

[English](CHANGELOG.md) · [Français](CHANGELOG.fr.md)

## 0.1.0 — 2026-10-28

Première version de la démonstration autonome PDF vers HTML de PDFToolkit.

- Convertir localement les PDF balisés choisis dans un nouveau Worker PHP 8.3
  WebAssembly, avec le package HTML 0.6.0 sans modification et ses dépendances
  Reader/core verrouillées. La conversion vérifie les entiers 64 bits et les
  extensions requises, borne fichiers, pages, mémoire, durée et sorties, et
  s’annule en terminant le Worker. Les PDF importés et résultats ne sont ni
  envoyés ni conservés dans un stockage persistant.
- Proposer une galerie bilingue de sept véritables conversions : structure,
  tableaux/listes, MathML, réinitialisation sélective, apparences de widgets,
  graphiques regroupés et statut de signature. Six PDF sources sont créés avec
  des objets explicites du core ; la signature utilise un cas publié inchangé
  et son certificat public.
- Afficher PDF et HTML côte à côte, permettre l’inspection du HTML, des
  diagnostics et du code source, conserver les contrôles accessibles au clavier
  et télécharger le PDF original ou le HTML exact avec ses ressources en ZIP.
  L’isolation de l’aperçu reste distincte des octets téléchargeables.
- Désactiver les scripts PDF sources et les ressources distantes. Seul le cas
  de réinitialisation sélectionné active la logique de la bibliothèque. Le
  rendu raster et la vérification de signature sont des capacités explicites
  du build de galerie, non activées par les imports ordinaires. L’intégrité
  d’une signature n’établit ni confiance PKI, ni révocation, ni permission de
  modifications ultérieures ; le HTML dérivé n’est pas signé.
- Rendre les pages sources en PNG avec Poppler et capturer les véritables body
  des iframes HTML avec Chromium/Playwright épinglés. Consigner révisions des
  packages, versions des moteurs, inventaires complets, tailles et SHA-256.
  Publier le HTML dérivé et le code PHP comme téléchargements texte. La
  provenance d’un brouillon ne peut pas servir à une publication.
- Inclure les guides de reproduction FR/EN, les oracles PDF/HTML/PNG indépendants
  épinglés, les contrôles PHP natifs 8.3/8.4/8.5 et les tests Chromium/Firefox.
  Ces contrôles conservent provenance et captures sans promettre prise en charge
  PDF universelle, équivalence visuelle, accessibilité complète ou confiance
  du certificat.
- Distribuer des fichiers statiques pour un hébergement autonome et une
  intégration vérifiée dans la documentation. Aucun backend ou runtime Docker
  n’est nécessaire au déploiement ; les dépendances conservent leurs licences
  et leurs références de sources.
