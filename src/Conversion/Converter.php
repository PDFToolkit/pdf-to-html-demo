<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Conversion;

use PDF\Html\DerivationException;
use PDF\Html\DerivationLimits;
use PDF\Html\DerivationPolicy;
use PDF\Html\HtmlDeriver;
use PDF\Html\PdfToHtml;
use PDF\Html\Reading\ReadPdfSource;
use PDF\Html\Reading\ReadingException;
use PDF\Html\Reading\ReadingLimits;
use PDF\Reading\EncryptedPdfException;
use PDF\Reading\FileBytes;
use PDF\Reading\ParseException;
use PDF\Reading\UnsupportedPdfFeature;

/** Every conversion owns fresh, bounded parser and derivation state. No I/O occurs here. */
final readonly class Converter
{
    public function convert(ConversionInput $input): ConversionOutput
    {
        $policy = new DerivationPolicy();
        $limits = new DerivationLimits(maximumNodes: 20000, maximumDepth: 64, maximumOutputBytes: 8 * 1024 * 1024, maximumAssetBytes: 8 * 1024 * 1024);
        $sourceLimits = new ReadingLimits(
            maximumDepth: 64,
            maximumNodes: 30000,
            maximumInstructions: 300000,
            maximumContentBytes: 32 * 1024 * 1024,
            maximumTextBytes: 4 * 1024 * 1024,
            maximumMappings: 100000,
            maximumAssetsBytes: 8 * 1024 * 1024,
            maximumPages: 100,
        );
        $converter = new PdfToHtml(
            reader: (new ReaderFactory())->create(),
            source: new ReadPdfSource(limits: $sourceLimits, policy: $policy, derivationLimits: $limits),
            deriver: new HtmlDeriver($policy, $limits),
        );
        try {
            return new ConversionOutput($converter->convert(new FileBytes($input->bytes), $input->filename));
        } catch (EncryptedPdfException) {
            throw new ConversionFailure('encrypted_pdf', 'This PDF is encrypted. The browser demo does not request passwords or private keys.');
        } catch (UnsupportedPdfFeature) {
            throw new ConversionFailure('unsupported_pdf', 'This PDF uses a feature that the browser demo cannot interpret.');
        } catch (ReadingException $error) {
            if (str_contains($error->getMessage(), 'tagged PDF structure tree') || str_contains($error->getMessage(), 'no derivable structure elements')) {
                throw new ConversionFailure('untagged_pdf', 'This PDF has no usable tagged structure. The demo does not perform OCR or reconstruct a document from page pixels.');
            }
            throw $this->failure($error, 'unsupported_pdf', 'The tagged structure or content contains a feature this demo cannot derive.');
        } catch (ParseException $error) {
            throw $this->failure($error, 'invalid_pdf', 'The PDF is malformed or its structure cannot be read safely.');
        } catch (DerivationException $error) {
            throw $this->failure($error, 'unsupported_pdf', 'This document cannot be safely represented by the demo conversion profile.');
        }
    }

    private function failure(\Throwable $error, string $fallback, string $message): ConversionFailure
    {
        if (preg_match('/budget|exceed|too large|(?:reached|exhausted).*limit/i', $error->getMessage()) === 1) {
            return new ConversionFailure('resource_limit', 'The PDF exceeds a demo processing limit. Try a smaller or simpler tagged PDF.');
        }
        return new ConversionFailure($fallback, $message);
    }
}
