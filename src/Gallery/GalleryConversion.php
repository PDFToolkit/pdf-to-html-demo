<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

use PDF\Html\DerivationPolicy;
use PDF\Html\DerivationResult;
use PDF\Html\Forms\FormActionPolicy;
use PDF\Html\HtmlDeriver;
use PDF\Html\PdfToHtml;
use PDF\Html\Reading\ReadPdfSource;
use PDF\Html\Reading\StructureValidationMode;
use PDF\Html\Rendering\RasterContentRenderer;
use PDF\Html\Signatures\SignatureOutputValidation;
use PDF\Reading\FileBytes;
use PDF\Security\CertificateChain;
use PDF\Security\OpenSslSignatureOutputVerifier;
use PDF\Security\X509Certificate;
use PDF\Syntax\Object\StringObject\HexadecimalString;

/** Each case explicitly selects only the capabilities its documentation describes. */
final readonly class GalleryConversion
{
    public function __construct(private PopplerRasterizer $rasterizer = new PopplerRasterizer())
    {
    }

    public function convert(GalleryCase $case): DerivationResult
    {
        $policy = match ($case->profile) {
            'basic', 'signature' => new DerivationPolicy(),
            'reset' => new DerivationPolicy(formActions: new FormActionPolicy(allowReset: true)),
            'rendering' => new DerivationPolicy(preferVisualFigures: true),
            default => throw new \InvalidArgumentException('Unknown gallery conversion profile.'),
        };
        $signature = $case->profile === 'signature'
            ? new SignatureOutputValidation(new OpenSslSignatureOutputVerifier(), new CertificateChain(new X509Certificate(new HexadecimalString($case->certificate ?? throw new \InvalidArgumentException('The signature profile requires its explicit certificate.')))))
            : null;
        $deriver = new HtmlDeriver(policy: $policy, renderer: $case->profile === 'rendering' ? new RasterContentRenderer($this->rasterizer) : null);
        $source = new ReadPdfSource(policy: $policy, structureValidation: StructureValidationMode::Strict, signatureValidation: $signature);
        return (new PdfToHtml(source: $source, deriver: $deriver))->convert(new FileBytes($case->pdf), $case->id . '.pdf');
    }
}
