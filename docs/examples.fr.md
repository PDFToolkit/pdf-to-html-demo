# De vrais exemples PDF

[English](examples.md) · [Français](examples.fr.md)

La galerie part de véritables octets PDF et les convertit avec la version publiée
**0.7.0** de `pdftoolkit/pdf-to-html`, révision
`c82bf04fd7a920e16abfd2eca19918176375a734`. Son HTML est la sortie exacte du
convertisseur. L’application ne fabrique pas du HTML pour simuler une conversion.

`src/Gallery/CaseFactory.php` crée six PDF avec des objets explicites du core :
opérateurs de contenu, polices et métriques, arbre de structure logique, relations
ParentTree, attributs, fichiers associés et widgets AcroForm. `PdfScene` sérialise
ces objets. Le bandeau décoratif est explicitement marqué `Artifact`. Le septième
PDF est un cas de test de signature publié, conservé sans modification. Trois
PDF image créés par `ImageCaseFactory` portent la galerie à dix cas.

| Identifiant | Points à observer | Profil de conversion |
| --- | --- | --- |
| `structure` | Ordre de lecture, titres, paragraphes sélectionnables, retour à la ligne ; le bandeau décoratif est absent du HTML. | `basic` |
| `table-listes` | Légende, en-têtes de colonnes et relations `Headers` explicites, puis une véritable liste numérotée. | `basic` |
| `mathml` | Une formule peinte dans le PDF et une alternative MathML incorporée ; le navigateur compose son exposant et sa fraction. | `basic` |
| `formulaire-reset` | Modifier Name et Language, puis réinitialiser : Name reprend sa valeur PDF par défaut Ada Lovelace ; Language reste hors de la sélection. | `reset` |
| `apparences` | Un bouton natif avec les apparences PDF normale, de survol et d’appui. | `rendering` |
| `graphique` | Barres, texte et valeurs d’une figure sont rendus ensemble ; le texte voisin reste du HTML sélectionnable. | `rendering` |
| `jpeg` | Un JPEG original et une inversion Decode PDF explicite, réellement décodé en PNG par PHP. | `basic` |
| `jpeg2000` | Le dessin RGB original, codé sans perte en JP2 puis décodé en PNG par PHP. | `basic` |
| `jbig2` | Un dessin monochrome sans perte dans une véritable région générique MMR de JBIG2. | `basic` |
| `signature` | Ouvrir le statut natif par souris ou clavier. Le PDF original est contrôlé avec un certificat public de test explicitement choisi. | `jpeg` | Un JPEG original et une inversion Decode PDF explicite, réellement décodé en PNG par PHP. | `basic` |
| `jpeg2000` | Le dessin RGB original, codé sans perte en JP2 puis décodé en PNG par PHP. | `basic` |
| `jbig2` | Un dessin monochrome sans perte dans une véritable région générique MMR de JBIG2. | `basic` |
| `signature` |

L’interface explicative est bilingue. Les PDF créés utilisent du texte anglais
ASCII et Helvetica avec des métriques explicites ; ils ne démontrent pas tous
les systèmes d’écriture, toutes les polices ou toutes les exigences
d’accessibilité. La structure du tableau et les textes alternatifs sont des
exemples, pas une certification d’accessibilité.

## Des capacités explicites

`basic` utilise la politique de dérivation sûre par défaut, avec validation
stricte de la structure source pour le build de la galerie. Il n’active ni
ECMAScript PDF ni ressources distantes. Les PDF basiques, dont les trois cas
image, sont comparés entre PHP natif et la conversion WebAssembly du navigateur.

`reset` ajoute uniquement `FormActionPolicy(allowReset: true)`. Le convertisseur
émet un fichier de la bibliothèque `pdf-script-<sha256>.js` avec le type
`text/javascript`. Le manifeste conserve ses octets et son empreinte exacts.
Ce script applique les valeurs PDF par défaut et la sélection de champs ; aucun
JavaScript PDF ni envoi n’est permis. L’apparence source du bouton n’est
volontairement pas rasterisée dans ce profil, ce que signalent les diagnostics.

`rendering` fournit explicitement `RasterContentRenderer` et le
`PopplerRasterizer` utilisé au build. Il sélectionne aussi `preferVisualFigures`.
Poppler reçoit du convertisseur un PDF isolé pour peindre une figure ou une
apparence. L’aperçu de la page PDF source est rendu séparément dans le même
environnement de build épinglé. L’application statique contient les images
produites ; elle n’exécute pas Poppler et n’exige aucun serveur pour un import.

`signature` fournit explicitement `SignatureOutputValidation`, le
`OpenSslSignatureOutputVerifier` du core et le certificat public du cas de test.
`integrity-verified` signifie que les octets de la révision signée se vérifient
avec ce certificat choisi. Cela n’établit ni confiance PKI, ni validité actuelle
du certificat, ni statut de révocation, ni autorisation de modifications
ultérieures, ni authenticité du HTML dérivé. Le certificat est volontairement
auto-signé et expiré. La galerie copie seulement `signed-padded.pdf` et
`signer.der` du cas publié ; elle ne lit ni n’inclut de clé de signature. Le statut
natif ne nécessite pas de JavaScript.

Les imports du navigateur utilisent un profil sûr distinct. Ils ne reçoivent
pas d’exécution reset, de moteur raster ou de vérificateur de signature parce
que la galerie démontre ces capacités explicitement activées. Un PDF importé
depuis une fiche peut donc produire un résultat différent de sa conversion
préparée lorsque son profil n’est pas `basic`.

## Images sources et preuves des pixels

`tools/generate_image_examples.py` crée un dessin original de 320 × 160 pixels
et le code avec Pillow, libjpeg, OpenJPEG et libtiff. Les versions, empreintes
et PNG de référence sont conservés sous `resources/images/` ; aucune photo
tierce ni image de test normative n’est utilisée. La galerie incorpore les
octets compressés exacts dans des objets image PDF natifs. Ces outils ne servent
qu’à régénérer les entrées conservées, jamais dans le navigateur ni lors d’un
build ordinaire de la galerie.

L’entrée JPEG contient les couleurs inversées et le PDF fournit `/Decode [1 0
1 0 1 0]`. Cela impose un vrai décodage PHP au lieu de conserver directement un
JPEG compatible. La référence est décodée indépendamment par libjpeg puis
inversée suivant ce tableau PDF. La différence admise observée pour cet exemple
est d’au plus trois niveaux par canal sur huit bits ; JPEG n’est pas sans perte.
JP2 et JBIG2 sont comparés exactement aux pixels originaux. Cette tolérance est
propre au cas, pas une garantie générale du codec.

Chaque cas image publie `encoded-image.bin`, `reference-image.png` et
`image-provenance.json`, avec leurs empreintes dans l’inventaire complet.
`validate_demo.py` contrôle indépendamment le flux PDF incorporé, les dimensions,
le tableau Decode et les pixels avec pypdf et Pillow. Chromium et Firefox
importent ensuite les vrais PDF dans de nouveaux Workers WebAssembly et
comparent le HTML et les ressources PNG exacts à la conversion native. Les
captures PNG montrent le véritable aperçu isolé.

## Reconstruire

Installer le verrou Composer exact et disposer de PHP 8.3 ou plus récent avec
DOM, mbstring, zlib et OpenSSL, ainsi que d’un `pdftoppm` local. L’application
publiée ne nécessite ni Docker ni backend. Un environnement reproductible doit
épingler PHP, Poppler et les polices système ; le manifeste relève la version
réelle de Poppler.

```sh
composer install --no-dev --prefer-dist --no-interaction
php bin/build-gallery.php --output dist/gallery \
  --html-source ../pdf-to-html --revision "$(git rev-parse HEAD)" --version 0.2.0
```

`--html-source` désigne le checkout publié du module HTML contenant
`tests/Fixtures/signatures/`. Le builder vérifie les empreintes SHA-256 exactes
retenues du PDF et du certificat. La galerie finale exige les dix cas.
Le build final exige aussi le Git HEAD exact et propre du dépôt de démo ;
`--revision` peut être omis pour le lire directement. `--pdftoppm` permet de
choisir explicitement l’exécutable local.

Avant le premier commit, utiliser `--draft` à la place de `--revision`. Les
manifestes portent alors `draft: true` et `generator.commit: null` : ce sont des
artefacts de revue à ne pas publier. Sans `--html-source`, un brouillon contient
les neuf PDF créés. La reconstruction d’une galerie existante ne
remplace que les fichiers dont les empreintes correspondent encore à son
manifeste précédent ; tout fichier inconnu ou modifié provoque un refus.

L’inspection indépendante s’exécute sur un build complet de l’application :

```sh
python -m pip install --require-hashes -r tools/validation-requirements.txt
python tools/validate_demo.py dist --report _build/validation.json --require-release
```

Elle utilise pypdf pour les objets PDF réels, HTML5lib pour les récupérations du
parseur et les relations sémantiques, puis Pillow et un nouveau rendu Poppler
pour les dimensions PNG et les pages sources non vides. Omettre
`--require-release` pour une revue de brouillon ; le rapport porte alors
`publicationEligible: false`. Les interactions navigateur et l’égalité PHP
natif/WebAssembly sont des contrôles distincts que cet oracle ne déduit pas.

Le processus est réparti entre objets :

- `PdfNode`, `PdfScene`, `CaseFactory` : création et description des exemples.
- `ImageFixture`, `ImageFixtures`, `ImageCaseFactory` : entrées compressées vérifiées et pages image balisées.
- `ReaderFactory` : décodage image PHP explicite et borné commun à la galerie et aux imports.
- `GalleryConversion` : politiques explicites et appels du convertisseur publié.
- `PopplerRasterizer`, `ProcessRunner` : rendu local borné.
- `GalleryBuilder` : fichiers, provenance, empreintes et publication complète du manifeste.

`example.php.txt` est le code exact de la fabrique, pas un script autonome. Ses
objets auxiliaires et le CLI sont inclus sous `source/` dans la galerie. Le dépôt
et son verrou Composer fournissent le contexte exécutable.

## Manifeste et preuves téléchargeables

`dist/gallery/gallery-manifest.json` utilise la version 1 du schéma. Ses chemins
sont relatifs à ce dossier. `generator` identifie le package de démo, sa version
et son commit exact. `htmlPackage` identifie la version et la révision du
convertisseur. Chaque cas contient `title`, `description` et `observations`
bilingues, son `profile`, ses `capabilities`, sa provenance, ses caractéristiques
`expected` et ces fichiers :

- `<id>/source.pdf` : octets originaux.
- `<id>/result.html.txt` : HTML dérivé exact, servi en `text/plain`.
- `<id>/page-1.png` : aperçu du PDF source, dimensions réelles dans `pages`.
- `<id>/example.php.txt` : code exact de la fabrique, servi en `text/plain`.
- `<id>/diagnostics.json` : diagnostics intégraux et empreintes de l’entrée et de la sortie.
- Ressources du convertisseur à côté du HTML ; le cas de signature inclut aussi `signer.der`.

Chaque fichier comporte `path`, `bytes`, `sha256` et `mediaType`. Le tableau racine
`assets` inventorie tous les fichiers livrés sauf le manifeste lui-même, y
compris le code auxiliaire. `source.kind` vaut `generated` (commit de cette démo)
ou `published-fixture` (chemin exact du cas HTML 0.7.0). Ce builder ne produit aucun
document `.html` directement navigable. L’application vérifie et isole les
aperçus séparément ; un nom de fichier ou une empreinte ne constitue pas à lui
seul une autorisation d’exécuter un script.

Les assertions de build vérifient les éléments sémantiques attendus, les profils
passifs ou avec script et le statut de signature. La publication exige aussi les
comparaisons PHP natif/WebAssembly et les contrôles d’interaction Chromium et
Firefox du dépôt. Le manifeste prouve les octets et leur provenance ; il ne
promet ni conversion PDF universelle ni équivalence visuelle.
