# Historique des versions

[English](CHANGELOG.md) · [Français](CHANGELOG.fr.md)

## Non publié

## 0.2.0 — 2026-10-29

- Utiliser HTML 0.7, Reader 0.7, le core 0.12.1 et Codecs PHP optionnel 0.1 publiés,
  en conservant les quatre identités exactes de source et distribution dans le
  manifeste du runtime.
- Ajouter les exemples JPEG, JPEG 2000 et JBIG2 à la galerie bilingue, avec PDF
  originaux, ressources PNG dérivées, provenance des composantes et comparaisons
  de pixels indépendantes. La galerie contient dix conversions réelles.
- Décoder les images prises en charge entièrement en PHP dans les Workers du
  navigateur, avec la même configuration Reader explicite pour la galerie et
  les PDF importés. Conserver les octets sources et les diagnostics explicites
  pour les profils hors de la politique de conversion bornée du navigateur.
- Limiter les codecs à quatre composantes, un million de pixels, vingt millions
  d’unités de travail et 64 Mio de mémoire codec dans la limite existante de
  128 Mio du Worker. L’annulation termine le Worker ; les imports restent locaux
  et ne sont jamais conservés dans un stockage persistant.
- Vérifier les trois imports d’images, les octets HTML et ressources des ZIP et
  les sorties PHP natif/WebAssembly dans Chromium et Firefox, avec les contrôles
  existants de confidentialité, entrées hostiles, annulation, clavier et mobile.
  Conserver les attributions PDF.js/Apache dans le runtime et les archives.
- Limiter le témoin JPEG 2000 de la galerie à 160 × 80 pixels pour les runtimes
  WebAssembly plus lents, avec sa référence indépendante sans perte et la limite
  Worker inchangée de 30 secondes. Conserver durée d’import, messages d’échec
  et captures dans les preuves navigateur. Les erreurs de démarrage ne
  supposent plus une version de navigateur obsolète.

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
