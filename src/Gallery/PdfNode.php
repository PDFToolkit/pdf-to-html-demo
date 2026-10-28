<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

use PDF\Syntax\ContentStreamsResources\Operator;
use PDF\Syntax\Object\DictionaryType;

/** Immutable description of authored logical content; never an HTML substitute. */
final readonly class PdfNode
{
    /** @param list<self> $children @param list<Operator> $paint @param list<DictionaryType> $attributes */
    public function __construct(
        public string $role,
        public array $children = [],
        public array $paint = [],
        public array $attributes = [],
        public ?string $id = null,
        public ?string $alt = null,
        public ?DictionaryType $widget = null,
        public ?DictionaryType $associatedFile = null,
    ) {
    }
}
