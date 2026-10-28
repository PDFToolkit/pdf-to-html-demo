# PDFToolkit — démo PDF vers HTML

[English](README.md) · [Français](README.fr.md)

[Ouvrir la démo](https://pdftoolkit.github.io/fr/modules/to-html/demo/) pour comparer
de vrais PDF avec leur HTML sémantique, interagir avec les résultats et convertir
votre propre PDF balisé sans l’envoyer à un serveur.

L’application utilise la version publiée, sans modification, de
[`pdftoolkit/pdf-to-html` 0.7.0](https://github.com/PDFToolkit/pdf-to-html/releases/tag/v0.7.0),
avec ses dépendances Reader et core verrouillées. Un nouveau Worker PHP 8.3
WebAssembly par conversion exécute les mêmes objets PHP qu’une application native.
Le moteur doit déclarer des entiers 64 bits et les extensions DOM, mbstring, zlib
et ZIP. La dérivation PDF n’est pas réécrite en JavaScript.

## Essayer

Choisissez un exemple pour comparer son PDF source au véritable HTML obtenu.
Consultez le code ou les diagnostics, manipulez les contrôles et téléchargez la
source ou un ZIP contenant le HTML original et toutes ses ressources. Le
[guide des exemples](docs/examples.fr.md) explique ce que chaque cas démontre.

Choisissez ou déposez un PDF balisé pour le convertir localement. Le moteur ne se
télécharge qu’à la demande. Les fichiers restent dans la mémoire de la page et
du Worker : aucun point d’envoi, mesure d’audience, service worker, stockage
persistant du navigateur ou collecte d’identifiants. Effacez le fichier ou fermez
la page pour libérer la copie de l’application. L’annulation termine le Worker.
Le cache ordinaire du navigateur peut conserver les fichiers publics du moteur
et de l’application, jamais le PDF choisi ni le résultat généré.

Le profil navigateur accepte jusqu’à 8 Mio et 100 pages, avec un délai de
30 secondes, une limite mémoire PHP de 128 Mio, des budgets cumulatifs de lecture
et des sorties/ressources bornées. Les PDF malformés, chiffrés, non balisés ou non
pris en charge reçoivent un message explicite. Le profil ne déduit pas la structure,
ne fait pas d’OCR et ne reproduit pas la mise en page.

Les flux JPEG, JPEG 2000 et JBIG2 peuvent être décodés par les codecs PHP
embarqués, en exécution native comme dans WebAssembly. `ReaderFactory` choisit
explicitement le moteur PHP ; l’import ne lance aucun processus natif et ne
sollicite aucun serveur pour décoder une image. Le décodage est limité à
1 048 576 pixels, 4 096 pixels par dimension, quatre composantes, 20 millions
unités de travail et 64 Mio de mémoire comptabilisée pour les codecs, dans les
limites globales du Worker. Le consommateur HTML exige toujours un espace
colorimétrique, une profondeur et une grille représentables ; les sémantiques
image non prises en charge restent signalées. Cela n’ajoute pas de rendu de page.

Les scripts PDF et ressources distantes sont désactivés. Le résultat apparaît
dans une iframe isolée ; ses liens ne peuvent pas charger de destination distante.
Seul l’exemple de réinitialisation sélectionné active le runtime de formulaire de
la bibliothèque, sans ECMAScript PDF. Son iframe n’a aucune permission d’origine
partagée, d’envoi de formulaire, de fenêtre ou de navigation principale. Le
téléchargement contient la sortie originale du convertisseur, sans la couche
d’isolation supplémentaire de l’aperçu. Un budget limite aussi l’expansion des
ressources intégrées à l’aperçu ; les résultats trop volumineux restent
consultables en code HTML et téléchargeables en ZIP.

Le rendu graphique et la vérification de signature de certains exemples sont des
**capacités applicatives explicitement choisies à la construction**. Importer ces
PDF avec le profil navigateur par défaut peut donner un résultat différent,
expliqué par les diagnostics. L’exemple de signature utilise un certificat public
de test et vérifie l’intégrité, sans établir la confiance PKI ni les permissions
des modifications ultérieures.

## Construire et lancer

Prérequis : PHP 8.3+ 64 bits avec DOM, mbstring, zlib et OpenSSL ; Composer ; Node
24.18+ et npm 11.16+ ; Python 3.13 ; Poppler `pdftoppm`. Le build nécessite aussi
le Chromium épinglé par Playwright 1.62.1 pour capturer les véritables aperçus
HTML. Installez ce navigateur avant la construction. Utilisez le checkout
original de la version HTML publiée pour obtenir le cas de signature et vérifier
sa provenance :

```sh
composer install --no-dev
npm ci --ignore-scripts
node node_modules/playwright/cli.js install --with-deps chromium firefox
mkdir -p _build
git clone --branch v0.7.0 --depth 1 https://github.com/PDFToolkit/pdf-to-html.git _build/html-source
python3 tools/build_demo.py --output dist --html-source _build/html-source --draft
python3 -m http.server 8080 --directory dist
```

Ouvrez `http://localhost:8080`. L’interface française est sous `/fr/`. HTTPS ou
localhost est nécessaire aux API d’intégrité et de Worker du navigateur. Servez
`.wasm` avec son type MIME standard ; l’application charge explicitement les
octets compressés et ne dépend pas des en-têtes de compression de l’hébergeur.
Aucun en-tête spécial d’isolation entre origines ni serveur PHP n’est requis.
Choisissez un dossier de sortie neuf ou vide.

Pour une publication, remplacez `--draft` par `--revision` et le commit Git exact
d’un checkout propre. `demo-manifest.json` recense les ressources de l’application,
de la galerie et du moteur, avec taille et SHA-256 ; son propre JSON et les pages
HTML de lancement anglaise/française restent hors de cet inventaire. `gallery/gallery-manifest.json`
consigne séparément PDF, code, aperçus, HTML exact, diagnostics, capacités et
provenance des packages. `assets/runtime-manifest.json` conserve les versions
Composer/npm et du moteur. Une sortie de travail ne peut pas devenir une source
de documentation publiée.

Le build capture dix aperçus HTML dans la véritable application, avec
`?sample=<id>` et son iframe de résultat isolée. Il attend les polices et images,
puis capture le body de l’iframe sans modifier le document dérivé. Poppler rend
séparément les aperçus PDF originaux. Chaque entrée `files.htmlPreview` consigne
la taille, les dimensions et le SHA-256 du PNG ; `gallery.browserPreview` relève
les versions réelles de Chromium/Playwright et le viewport de capture. Ces
captures montrent aussi l’isolation supplémentaire de l’application, tandis que
`result.html.txt` reste la sortie exacte du convertisseur. Aucune page HTML
convertie brute n’est exposée pour navigation.

Le site de documentation fixe le tag publié et le commit de cette application
indépendamment des bibliothèques. Ses pages natives anglaise/française copient les
ressources statiques vérifiées ; elles n’exécutent pas PHP sur le serveur.

## Vérifier

```sh
php tests/conversion.php
php tests/image-conversion.php
python3 -m venv _build/validation-venv
_build/validation-venv/bin/python -m pip install --require-hashes -r tools/validation-requirements.txt
_build/validation-venv/bin/python tools/validate_demo.py dist --report _build/validation.json
node tests/browser.cjs --base-url http://localhost:8080/ --output _build/browser
```

Gardez le serveur local actif pour la commande navigateur. Ajoutez
`--require-release` à `validate_demo.py` pour un candidat de publication ; cette
option refuse la provenance d’un brouillon. L’oracle indépendant utilise pypdf,
HTML5lib, Pillow et un nouveau rendu Poppler pour contrôler la structure réelle,
les correspondances tableau/MathML/formulaire/signature, toutes les empreintes
et les aperçus PDF et HTML. Il ne déduit ni conversion universelle, ni identité
des pixels entre polices système, ni certification d’accessibilité, ni confiance
du certificat.

Les contrôles navigateur exécutent le véritable moteur WebAssembly, comparent ses
octets à la conversion native, vérifient galerie, formulaires, MathML et signatures,
exercent erreurs, annulation et confidentialité, et conservent des captures dans
les deux moteurs. La CI construit le candidat exact et conserve l’application et
les rapports. Les contrôles du pont PHP tournent sur PHP 8.3, 8.4 et 8.5.

Le code de l’application est sous licence MIT. PHP.wasm et les autres dépendances
conservent leurs licences, incluses dans `assets/runtime/licenses/` et l’archive
de l’application. Les références exactes de leurs sources accompagnent ces notices.
