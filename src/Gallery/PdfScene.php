<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

use PDF\Document\Fonts\FontDescriptor;
use PDF\Document\Fonts\FontDescriptorFlags;
use PDF\Document\Fonts\SimpleFontMetrics;
use PDF\Document\Fonts\SimpleWidths;
use PDF\Document\Fonts\StandardFont;
use PDF\Document\Fonts\Type1Font;
use PDF\Document\ResourceDictionary;
use PDF\Document\Resources\Font;
use PDF\Document\Structure\AttributeAssociation;
use PDF\Document\Structure\MarkInformation;
use PDF\Document\Structure\MarkedContentContainer;
use PDF\Document\Structure\MarkedContentIdentifier;
use PDF\Document\Structure\ObjectReference;
use PDF\Document\Structure\PageMarkedContent;
use PDF\Document\Structure\StructureAttributeObject;
use PDF\Document\Structure\StructureAttributes;
use PDF\Document\Structure\StructureElement;
use PDF\Document\Structure\StructureTreeRoot;
use PDF\FileStructure;
use PDF\Syntax\ContentStreamsResources\ContentStreams;
use PDF\Syntax\ContentStreamsResources\Operator;
use PDF\Syntax\ContentStreamsResources\Operators as Op;
use PDF\Syntax\DataStructure\Rectangle;
use PDF\Syntax\DataStructure\TextString;
use PDF\Syntax\DocumentStructure\DocumentCatalog;
use PDF\Syntax\DocumentStructure\PageTree\PageObject;
use PDF\Syntax\DocumentStructure\PageTree\PageTreeNode;
use PDF\Syntax\FileStructure\BasicType;
use PDF\Syntax\FileStructure\FileBody;
use PDF\Syntax\FileStructure\FileHeader;
use PDF\Syntax\Object\ArrayType;
use PDF\Syntax\Object\BooleanType;
use PDF\Syntax\Object\DictionaryObject\Entry;
use PDF\Syntax\Object\DictionaryType;
use PDF\Syntax\Object\IndirectReference;
use PDF\Syntax\Object\IntegerType;
use PDF\Syntax\Object\NameType;
use PDF\Syntax\Object\NumericType;
use PDF\Syntax\Object\StreamObject;
use PDF\Syntax\Object\StringObject\LiteralString;

/** Explicit one-page PDF authoring with a document-scoped logical graph. */
final readonly class PdfScene
{
    public ResourceDictionary $resources;

    public function __construct()
    {
        // Adobe Helvetica AFM ASCII advances, also retained by the HTML reading fixture.
        $widths = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
        $metrics = new SimpleFontMetrics(
            new SimpleWidths(new IntegerType(32), ...array_map(static fn (int $width): NumericType => new NumericType($width), $widths)),
            new FontDescriptor(null, new NameType('Helvetica'), new FontDescriptorFlags(32), $this->rectangle(-166, -225, 1000, 931), new NumericType(0), new NumericType(718), new NumericType(-207), new NumericType(718), new NumericType(88)),
        );
        $font = new Type1Font(StandardFont::Helvetica, $metrics, new Entry(new NameType('Encoding'), new NameType('WinAnsiEncoding')));
        $this->resources = new ResourceDictionary(new Font($this->dictionary(['F1' => new IndirectReference($font)])));
    }

    /** @param array<string, BasicType> $values */
    public function dictionary(array $values): DictionaryType
    {
        $entries = [];
        foreach ($values as $key => $value) {
            $entries[] = new Entry(new NameType($key), $value);
        }
        return new DictionaryType(...$entries);
    }

    public function rectangle(float $left, float $bottom, float $right, float $top): Rectangle
    {
        return new Rectangle(new NumericType($left), new NumericType($bottom), new NumericType($right), new NumericType($top));
    }

    /** @return list<Operator> */
    public function text(string $text, float $x, float $y, float $size = 12, array $color = [0.12, 0.18, 0.27]): array
    {
        if (preg_match('/[^\x20-\x7e]/', $text) === 1) {
            throw new \InvalidArgumentException('The authored Helvetica samples use explicit printable ASCII.');
        }
        return [new Op\SaveGraphicsState(), new Op\SetNonstrokingRGBColor(...array_map(static fn (float|int $v): NumericType => new NumericType($v), $color)), new Op\BeginTextObject(), new Op\SetTextFontAndSize(new NameType('F1'), new NumericType($size)), new Op\MoveTextPosition(new NumericType($x), new NumericType($y)), new Op\ShowText(new LiteralString($text)), new Op\EndTextObject(), new Op\RestoreGraphicsState()];
    }

    /** @return list<Operator> */
    public function block(float $x, float $y, float $width, float $height, array $color): array
    {
        return [new Op\SaveGraphicsState(), new Op\SetNonstrokingRGBColor(...array_map(static fn (float|int $v): NumericType => new NumericType($v), $color)), new Op\AppendRectangle(new NumericType($x), new NumericType($y), new NumericType($width), new NumericType($height)), new Op\FillPathNonzero(), new Op\RestoreGraphicsState()];
    }

    /** Author CSS is part of the PDF's attributes, never patched onto derived HTML. @param array<string,string> $values */
    public function css(array $values): DictionaryType
    {
        return $this->dictionary(['O' => new NameType('CSS-3.00'), ...array_map(static fn (string $value): LiteralString => new LiteralString($value), $values)]);
    }

    public function paragraph(string $text, float $y, string $role = 'P', float $size = 12, ?string $id = null): PdfNode
    {
        return new PdfNode($role, paint: $this->text($text, 48, $y, $size), attributes: [$this->css(['margin' => $role === 'H1' ? '0 0 20px' : '12px 0', 'line-height' => '1.5', 'color' => '#1e2e46'])], id: $id);
    }

    /** @param list<PdfNode> $children */
    public function build(string $title, array $children, ?ResourceDictionary $resources = null): string
    {
        $rootNode = new PdfNode('Document', children: $children, attributes: [$this->css(['font-family' => 'Arial, sans-serif', 'font-size' => '16px', 'max-width' => '720px', 'margin' => '0 auto', 'padding' => '28px', 'color' => '#1e2e46'])]);
        $indexes = new \SplObjectStorage();
        $widgets = [];
        $operators = [new Op\BeginMarkedContent(new NameType('Artifact')), ...$this->block(0, 766, 612, 26, [0.10, 0.35, 0.53]), ...$this->text('PDFToolkit / real tagged PDF demonstration', 48, 775, 9, [1, 1, 1]), new Op\EndMarkedContent()];
        $this->collect($rootNode, $indexes, $operators, $widgets);
        $entries = [new Entry(new NameType('StructParents'), new IntegerType(0))];
        if ($widgets !== []) {
            $entries[] = new Entry(new NameType('Annots'), new ArrayType(...array_map(static fn (DictionaryType $widget): IndirectReference => new IndirectReference($widget), $widgets)));
        }
        $page = new PageObject($this->rectangle(0, 0, 612, 792), $resources ?? $this->resources, new StreamObject(new ContentStreams(...$operators)), ...$entries);
        $pages = (new PageTreeNode())->addKid($page);
        $tree = new StructureTreeRoot($pages);
        $container = new MarkedContentContainer($page, new IntegerType(0));
        $tree->addKid($this->structure($rootNode, $page, $container, $indexes));
        $catalogEntries = [...$tree->catalogEntries(new MarkInformation(new BooleanType(true))), new Entry(new NameType('Lang'), new TextString('en'))];
        if ($widgets !== []) {
            $catalogEntries[] = new Entry(new NameType('AcroForm'), $this->dictionary(['Fields' => new ArrayType(...array_map(static fn (DictionaryType $widget): IndirectReference => new IndirectReference($widget), $widgets)), 'DA' => new LiteralString('/F1 12 Tf 0 g'), 'DR' => $this->resources]));
        }
        $catalog = new DocumentCatalog($pages, ...$catalogEntries);
        $info = $this->dictionary(['Title' => new TextString($title), 'Creator' => new TextString('PDFToolkit demo object builders')]);
        return (new FileStructure(new FileHeader('2.0'), new FileBody($catalog), new IndirectReference($catalog), trailerEntries: $this->dictionary(['Info' => new IndirectReference($info)])))->toPdf();
    }

    /** @param \SplObjectStorage<PdfNode,int> $indexes @param list<Operator> $operators @param list<DictionaryType> $widgets */
    private function collect(PdfNode $node, \SplObjectStorage $indexes, array &$operators, array &$widgets): void
    {
        if ($node->paint !== []) {
            $index = count($indexes);
            $indexes[$node] = $index;
            array_push($operators, (new MarkedContentIdentifier(new IntegerType($index)))->begin(new NameType($node->role)), ...$node->paint);
            $operators[] = new Op\EndMarkedContent();
        }
        if ($node->widget !== null) {
            $widgets[] = $node->widget;
        }
        foreach ($node->children as $child) {
            $this->collect($child, $indexes, $operators, $widgets);
        }
    }

    /** @param \SplObjectStorage<PdfNode,int> $indexes */
    private function structure(PdfNode $node, PageObject $page, MarkedContentContainer $container, \SplObjectStorage $indexes): StructureElement
    {
        $extra = [];
        if ($node->alt !== null) {
            $extra[] = new Entry(new NameType('Alt'), new TextString($node->alt));
        }
        if ($node->associatedFile !== null) {
            $extra[] = new Entry(new NameType('AF'), new ArrayType(new IndirectReference($node->associatedFile)));
        }
        $attributes = $node->attributes === [] ? null : new StructureAttributes(...array_map(static fn (DictionaryType $value): AttributeAssociation => new AttributeAssociation(new StructureAttributeObject($value)), $node->attributes));
        $element = new StructureElement(new NameType($node->role), $page, $node->id === null ? null : new LiteralString($node->id), $attributes, null, new IntegerType(0), ...$extra);
        if (isset($indexes[$node])) {
            $element->addKid(new PageMarkedContent($container, new MarkedContentIdentifier(new IntegerType($indexes[$node]))));
        }
        foreach ($node->children as $child) {
            $element->addKid($this->structure($child, $page, $container, $indexes));
        }
        if ($node->widget !== null) {
            $key = $node->widget->get('StructParent');
            if (!$key instanceof IntegerType) {
                throw new \LogicException('A widget requires its explicit parent-tree key.');
            }
            $element->addKid(new ObjectReference($page, $node->widget, $key));
        }
        return $element;
    }
}
