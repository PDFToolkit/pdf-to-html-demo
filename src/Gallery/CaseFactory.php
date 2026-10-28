<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

use PDF\Document\Forms\FormAppearanceStream;
use PDF\Syntax\ContentStreamsResources\ContentStreams;
use PDF\Syntax\Object\ArrayType;
use PDF\Syntax\Object\DictionaryType;
use PDF\Syntax\Object\IndirectReference;
use PDF\Syntax\Object\IntegerType;
use PDF\Syntax\Object\NameType;
use PDF\Syntax\Object\NumericType;
use PDF\Syntax\Object\StreamObject;
use PDF\Syntax\Object\StringObject\LiteralString;

/** Authored examples use real PDF objects and the package's native PDF reader. */
final readonly class CaseFactory
{
    public function __construct(private PdfScene $scene = new PdfScene())
    {
    }

    /** @return list<GalleryCase> */
    public function all(?string $signaturePdf = null, ?string $certificateDer = null, array $images = []): array
    {
        $cases = [$this->structure(), $this->table(), $this->math(), $this->form(), $this->appearances(), $this->graphics()];
        if ($signaturePdf !== null && $certificateDer !== null) {
            $cases[] = new GalleryCase(
                'signature',
                $signaturePdf,
                ['en' => 'A signature with an explanation', 'fr' => 'Une signature expliquée'],
                ['en' => 'Verify the original PDF with an explicitly selected public test certificate.', 'fr' => 'Vérifier le PDF original avec un certificat public de test explicitement choisi.'],
                ['en' => ['Open the status with a click or the space bar.', 'Integrity is distinct from certificate trust and later-change permissions.', 'The derived HTML is not signed.'], 'fr' => ['Ouvrir le statut par clic ou barre espace.', 'L’intégrité est distincte de la confiance du certificat et des permissions ultérieures.', 'Le HTML dérivé n’est pas signé.']],
                'signature',
                ['explicit-certificate', 'core-signature-verifier'],
                ['signatureStatus' => 'integrity-verified', 'scripts' => false],
                $certificateDer,
                'tests/Fixtures/signatures/signed-padded.pdf'
            );
        }
        foreach ($images as $image) {
            $cases[] = (new ImageCaseFactory($this->scene))->create($image);
        }
        return $cases;
    }

    private function structure(): GalleryCase
    {
        $s = $this->scene;
        $nodes = [$s->paragraph('A small guide to better documents', 716, 'H1', 26), $s->paragraph('Reading order belongs to the content, not to its coordinates.', 670), $s->paragraph('1. Start with meaning', 618, 'H2', 19), $s->paragraph('Headings, paragraphs and lists describe the document.', 584), $s->paragraph('They remain text when the browser changes its width.', 558), $s->paragraph('2. Keep the useful content', 503, 'H2', 19), $s->paragraph('A decorative page banner is not part of the reading order.', 469), $s->paragraph('The HTML reflows while the original PDF stays available.', 443)];
        return new GalleryCase('structure', $s->build('A small guide to better documents', $nodes), ['en' => 'Content that reflows', 'fr' => 'Un contenu qui se réorganise'], ['en' => 'A real tagged page becomes headings and paragraphs in reading order.', 'fr' => 'Une vraie page balisée devient des titres et paragraphes dans l’ordre de lecture.'], ['en' => ['Resize the HTML preview to compare reflow.', 'The decorative PDF banner is omitted.', 'Text remains selectable.'], 'fr' => ['Redimensionner l’aperçu HTML pour observer le retour à la ligne.', 'Le bandeau décoratif du PDF est omis.', 'Le texte reste sélectionnable.']], expected: ['tags' => ['h1', 'h2', 'p'], 'scripts' => false]);
    }

    private function table(): GalleryCase
    {
        $s = $this->scene;
        $rows = [];
        $headers = ['Item', 'Quantity', 'Amount'];
        $xs = [48, 300, 430];
        $row = [];
        foreach ($headers as $i => $text) {
            $row[] = new PdfNode('TH', paint: $s->text($text, $xs[$i], 625, 13), attributes: [$s->dictionary(['O' => new NameType('Table'), 'Scope' => new NameType('Column')]), $s->css(['text-align' => 'left', 'padding' => '12px', 'background-color' => '#e8f1f7'])], id: 'column-' . $i);
        }
        $rows[] = new PdfNode('TR', children: $row);
        foreach ([['Paper', '2 boxes', '24.00 EUR'], ['Envelopes', '4 packs', '16.00 EUR'], ['Labels', '1 roll', '8.00 EUR']] as $r => $values) {
            $cells = [];
            foreach ($values as $i => $text) {
                $cells[] = new PdfNode('TD', paint: $s->text($text, $xs[$i], 590 - 35 * $r, 12), attributes: [$s->dictionary(['O' => new NameType('Table'), 'Headers' => new ArrayType(new LiteralString('column-' . $i))]), $s->css(['padding' => '12px', 'border-bottom' => '1px solid #d9e3ed'])]);
            }
            $rows[] = new PdfNode('TR', children: $cells);
        }
        $table = new PdfNode('Table', children: [new PdfNode('Caption', children: [new PdfNode('P', paint: $s->text('Office supplies / sample budget', 48, 663, 14))], attributes: [$s->css(['text-align' => 'left', 'padding' => '12px', 'font-weight' => 'bold'])]), ...$rows], attributes: [$s->dictionary(['O' => new NameType('Layout'), 'BBox' => $s->rectangle(40, 500, 560, 688)]), $s->css(['border-collapse' => 'collapse', 'width' => '100%'])]);
        $items = [];
        foreach (['Every amount belongs to its column header.', 'The list stays a list after conversion.'] as $i => $text) {
            $items[] = new PdfNode('LI', children: [new PdfNode('Lbl', paint: $s->text(($i + 1) . '.', 48, 431 - $i * 30)), new PdfNode('LBody', paint: $s->text($text, 70, 431 - $i * 30))]);
        }
        $list = new PdfNode('L', children: $items, attributes: [$s->dictionary(['O' => new NameType('List'), 'ListNumbering' => new NameType('Decimal')])]);
        return new GalleryCase('table-listes', $s->build('A table with explicit headers', [$s->paragraph('A table with explicit headers', 716, 'H1', 25), $table, $s->paragraph('What survives the conversion', 470, 'H2', 18), $list]), ['en' => 'Tables and lists keep their structure', 'fr' => 'Tableaux et listes gardent leur structure'], ['en' => 'Column headers, cell relationships and a numbered list are authored in the PDF.', 'fr' => 'En-têtes, relations des cellules et liste numérotée sont décrits dans le PDF.'], ['en' => ['The caption stays with the table.', 'Each cell has an explicit header reference.', 'PDF and HTML remain separate presentations.'], 'fr' => ['La légende reste liée au tableau.', 'Chaque cellule référence explicitement son en-tête.', 'PDF et HTML restent deux présentations distinctes.']], expected: ['tags' => ['table', 'caption', 'th', 'td', 'ol'], 'scripts' => false]);
    }

    private function math(): GalleryCase
    {
        $s = $this->scene;
        $mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup><mo>+</mo><mfrac><mn>1</mn><mn>2</mn></mfrac></math>';
        $file = $s->dictionary(['Type' => new NameType('Filespec'), 'F' => new LiteralString('formula.mathml'), 'UF' => new LiteralString('formula.mathml'), 'AFRelationship' => new NameType('Alternative'), 'EF' => $s->dictionary(['F' => new IndirectReference(new StreamObject($mathml, $s->dictionary(['Type' => new NameType('EmbeddedFile'), 'Subtype' => new NameType('application/mathml+xml')])))])]);
        $paint = [...$s->text('E = m c', 206, 562, 28), ...$s->text('2', 301, 580, 17), ...$s->text('+', 326, 562, 28), ...$s->text('1', 360, 579, 18), ...$s->block(356, 568, 18, 1.2, [0.12, 0.18, 0.27]), ...$s->text('2', 360, 548, 18)];
        $formula = new PdfNode('Formula', paint: $paint, attributes: [$s->dictionary(['O' => new NameType('Layout'), 'Placement' => new NameType('Block'), 'Height' => new NumericType(60)]), $s->css(['font-size' => '30px', 'margin' => '28px 0'])], alt: 'E equals m c squared plus one half.', associatedFile: $file);
        return new GalleryCase('mathml', $s->build('Mathematics, not flattened text', [$s->paragraph('Mathematics, not flattened text', 716, 'H1', 25), $s->paragraph('The PDF paints a formula and embeds its MathML alternative.', 670), $formula, $s->paragraph('The browser lays out the exponent and fraction natively.', 486)]), ['en' => 'Native mathematical layout', 'fr' => 'Une mise en page mathématique native'], ['en' => 'An embedded MathML alternative becomes real MathML after reading the PDF.', 'fr' => 'Une alternative MathML incorporée devient du vrai MathML après lecture du PDF.'], ['en' => ['Inspect the exponent and fraction.', 'No image or handwritten output HTML replaces the formula.', 'This example uses browser-supported presentation MathML.'], 'fr' => ['Observer l’exposant et la fraction.', 'Aucune image ni sortie HTML fabriquée ne remplace la formule.', 'Ce cas utilise du MathML de présentation pris en charge par les navigateurs.']], expected: ['tags' => ['math', 'msup', 'mfrac'], 'scripts' => false]);
    }

    private function form(): GalleryCase
    {
        $s = $this->scene;
        $name = $this->widget('Name', 'Tx', [48, 580, 364, 614], 'Grace Hopper', 1, ['V' => new LiteralString('Grace Hopper'), 'DV' => new LiteralString('Ada Lovelace'), 'MaxLen' => new IntegerType(80)]);
        $language = $this->widget('Language', 'Ch', [48, 470, 364, 504], 'English', 2, ['Ff' => new IntegerType(131072), 'V' => new LiteralString('en'), 'Opt' => new ArrayType(new ArrayType(new LiteralString('en'), new LiteralString('English')), new ArrayType(new LiteralString('fr'), new LiteralString('French')))]);
        $reset = $this->widget('ResetName', 'Btn', [48, 370, 260, 410], 'Restore default name', 3, ['Ff' => new IntegerType(65536), 'A' => $s->dictionary(['S' => new NameType('ResetForm'), 'Fields' => new ArrayType(new LiteralString('Name'))])]);
        $nodes = [$s->paragraph('Try a real PDF form', 716, 'H1', 26), $s->paragraph('Edit the name, then restore its PDF default value.', 670), $this->field('Your name', 638, $name), $this->field('Language', 528, $language), $this->formNode($reset), $s->paragraph('Reset affects Name only. No form is submitted.', 327)];
        return new GalleryCase('formulaire-reset', $s->build('Try a real PDF form', $nodes), ['en' => 'A form you can try', 'fr' => 'Un formulaire à essayer'], ['en' => 'Edit the field and restore the explicit PDF default using only library-owned logic.', 'fr' => 'Modifier le champ puis restaurer sa valeur PDF par défaut avec la logique de la bibliothèque.'], ['en' => ['Name starts as Grace Hopper; reset restores Ada Lovelace.', 'Language is outside the reset selection.', 'No source PDF scripts or submissions are enabled.'], 'fr' => ['Name commence par Grace Hopper ; reset rétablit Ada Lovelace.', 'Language reste hors de la sélection de reset.', 'Aucun script PDF ni envoi n’est activé.']], 'reset', ['library-reset-runtime'], ['tags' => ['input', 'select', 'button'], 'resetField' => 'Name', 'defaultValue' => 'Ada Lovelace']);
    }

    private function appearances(): GalleryCase
    {
        $s = $this->scene;
        $normal = $this->appearance('Ready', 240, 60, [0.12, 0.39, 0.58]);
        $hover = $this->appearance('Hover', 240, 60, [0.10, 0.50, 0.39]);
        $down = $this->appearance('Pressed', 240, 60, [0.55, 0.25, 0.48]);
        $widget = $this->widget('Appearance', 'Btn', [48, 515, 288, 575], 'Try this button', 1, ['Ff' => new IntegerType(65536), 'H' => new NameType('P'), 'AP' => $s->dictionary(['N' => new IndirectReference($normal), 'R' => new IndirectReference($hover), 'D' => new IndirectReference($down)])]);
        return new GalleryCase('apparences', $s->build('The button has three real appearances', [$s->paragraph('Three real button appearances', 716, 'H1', 25), $s->paragraph('Normal, hover and pressed states come from the PDF.', 670), $this->formNode($widget), $s->paragraph('The library retains the control; the build supplies rasterization.', 465)]), ['en' => 'Normal, hover and pressed', 'fr' => 'Normal, survol et appui'], ['en' => 'A real widget appearance is rasterized with an explicit build-time engine.', 'fr' => 'Une vraie apparence de widget est rasterisée avec un moteur explicite au build.'], ['en' => ['Hover, then hold the button to see its PDF states.', 'The output remains a native HTML button.', 'Rendering requires the explicit engine used by this gallery.'], 'fr' => ['Survoler puis maintenir le bouton pour voir ses états PDF.', 'La sortie reste un bouton HTML natif.', 'Le rendu nécessite le moteur explicite utilisé par cette galerie.']], 'rendering', ['explicit-poppler-rasterizer'], ['tags' => ['button', 'img'], 'scripts' => false]);
    }

    private function graphics(): GalleryCase
    {
        $s = $this->scene;
        $paint = [];
        foreach ([['Research', 72, [0.12, 0.39, 0.58]], ['Design', 46, [0.10, 0.50, 0.39]], ['Delivery', 92, [0.55, 0.25, 0.48]]] as $i => [$name, $value, $color]) {
            $y = 580 - $i * 70;
            array_push($paint, ...$s->text($name, 48, $y + 12, 13), ...$s->block(160, $y, $value * 3.2, 34, $color), ...$s->text((string) $value, 170 + $value * 3.2, $y + 12, 12));
        }
        $figure = new PdfNode('Figure', paint: $paint, attributes: [$s->dictionary(['O' => new NameType('Layout'), 'BBox' => $s->rectangle(40, 425, 528, 630), 'Placement' => new NameType('Block'), 'Height' => new NumericType(205)])], alt: 'Example allocation: Research 72, Design 46, Delivery 92.');
        return new GalleryCase('graphique', $s->build('A complete figure, with its text', [$s->paragraph('A complete figure, with its text', 716, 'H1', 25), $s->paragraph('All bars, labels and values belong to one logical figure.', 670), $figure, $s->paragraph('The surrounding explanation remains selectable HTML text.', 370)]), ['en' => 'A complete graphic and its labels', 'fr' => 'Un graphique complet avec ses libellés'], ['en' => 'An isolated figure preserves its original painting while prose remains HTML.', 'fr' => 'Une figure isolée conserve sa peinture originale tandis que le texte reste du HTML.'], ['en' => ['Bars and labels are rendered together.', 'The source figure supplies its bounds and alternative text.', 'The surrounding paragraph is not rasterized.'], 'fr' => ['Barres et libellés sont rendus ensemble.', 'La figure source fournit ses limites et son texte alternatif.', 'Le paragraphe voisin n’est pas rasterisé.']], 'rendering', ['explicit-poppler-rasterizer'], ['tags' => ['figure', 'img', 'p'], 'scripts' => false]);
    }

    /** @param list<int> $rect @param array<string,\PDF\Syntax\FileStructure\BasicType> $extra */
    private function widget(string $name, string $type, array $rect, string $caption, int $key, array $extra = []): DictionaryType
    {
        $s = $this->scene;
        $appearance = $this->appearance($caption, $rect[2] - $rect[0], $rect[3] - $rect[1], [0.93, 0.96, 0.98]);
        return $s->dictionary(array_replace(['Type' => new NameType('Annot'), 'Subtype' => new NameType('Widget'), 'FT' => new NameType($type), 'T' => new LiteralString($name), 'Rect' => $s->rectangle(...$rect), 'F' => new IntegerType(4), 'StructParent' => new IntegerType($key), 'AP' => $s->dictionary(['N' => new IndirectReference($appearance)]), 'MK' => $s->dictionary(['CA' => new LiteralString($caption)]), 'DA' => new LiteralString('/F1 12 Tf 0 g')], $extra));
    }

    private function appearance(string $label, int $width, int $height, array $color): FormAppearanceStream
    {
        $s = $this->scene;
        return new FormAppearanceStream(new ContentStreams(...[...$s->block(0, 0, $width, $height, $color), ...$s->text($label, 12, max(10, ($height - 12) / 2), 12, array_sum($color) < 1.7 ? [1, 1, 1] : [0.12, 0.18, 0.27])]), $s->rectangle(0, 0, $width, $height), $s->resources);
    }

    private function formNode(DictionaryType $widget, ?string $label = null): PdfNode
    {
        $rectangle = $widget->get('Rect');
        if (!$rectangle instanceof \PDF\Syntax\DataStructure\Rectangle) {
            throw new \LogicException('An authored widget needs its explicit rectangle.');
        }
        $height = $rectangle->upperRightY->value - $rectangle->lowerLeftY->value;
        $attributes = [$this->scene->dictionary(['O' => new NameType('Layout'), 'Placement' => new NameType('Block'), 'Height' => new NumericType($height)]), $this->scene->css(['font-family' => 'inherit', 'font-size' => '16px', 'padding' => '8px 12px', 'border' => '1px solid #8499ac', 'border-radius' => '4px', 'max-width' => '100%'])];
        if ($label !== null) {
            $attributes[] = $this->scene->dictionary(['O' => new NameType('ARIA-1.1'), 'aria-label' => new LiteralString($label)]);
        }
        return new PdfNode('Form', widget: $widget, attributes: $attributes);
    }

    private function field(string $label, int $y, DictionaryType $widget): PdfNode
    {
        return new PdfNode('Div', children: [new PdfNode('P', paint: $this->scene->text($label, 48, $y, 13)), $this->formNode($widget, $label)], attributes: [$this->scene->css(['margin' => '20px 0'])]);
    }
}
