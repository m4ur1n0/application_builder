import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ExportRequestBody {
  coverLetterText: string;
  header: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const proxyBaseUrl = process.env.CLOUDFLARE_PROXY_BASE_URL;
    const internalKey = process.env.CLOUDFLARE_PROXY_INTERNAL_KEY;

    if (!proxyBaseUrl || !internalKey) {
      return NextResponse.json(
        { error: 'Proxy configuration missing' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: ExportRequestBody = await request.json();
    const { coverLetterText, header } = body;

    if (!coverLetterText?.trim()) {
      return NextResponse.json(
        { error: 'Cover letter text is required' },
        { status: 400 }
      );
    }

    if (!header?.name || !header?.email) {
      return NextResponse.json(
        { error: 'Header name and email are required' },
        { status: 400 }
      );
    }

    // Fetch resume PDF from Cloudflare
    const resumeResponse = await fetch(`https://${proxyBaseUrl}/proxy/resume`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'X-Internal-Key': internalKey,
      },
    });

    if (!resumeResponse.ok) {
      const errorText = await resumeResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch resume: ${resumeResponse.status} - ${errorText}` },
        { status: resumeResponse.status }
      );
    }

    const resumePdfBytes = await resumeResponse.arrayBuffer();

    // Generate cover letter PDF
    const coverLetterPdf = await PDFDocument.create();
    const font = await coverLetterPdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await coverLetterPdf.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 612; // 8.5 inches
    const pageHeight = 792; // 11 inches
    const margin = 72; // 1 inch
    const maxWidth = pageWidth - 2 * margin;
    const fontSize = 11;
    const lineHeight = fontSize * 1.5;
    const headerFontSize = 12;

    let page = coverLetterPdf.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    // Draw header
    const headerLines: string[] = [];
    if (header.name) headerLines.push(header.name);
    if (header.email) headerLines.push(header.email);
    if (header.phone) headerLines.push(header.phone);
    if (header.address) headerLines.push(header.address);

    for (const line of headerLines) {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: headerFontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
    }

    // Add spacing after header
    yPosition -= lineHeight;

    // Draw cover letter content
    const paragraphs = coverLetterText.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;

      // Word wrap the paragraph
      const words = paragraph.trim().split(/\s+/);
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          // Draw current line and start new line
          if (currentLine) {
            // Check if we need a new page
            if (yPosition < margin + lineHeight) {
              page = coverLetterPdf.addPage([pageWidth, pageHeight]);
              yPosition = pageHeight - margin;
            }

            page.drawText(currentLine, {
              x: margin,
              y: yPosition,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            });
            yPosition -= lineHeight;
          }
          currentLine = word;
        }
      }

      // Draw remaining line
      if (currentLine) {
        if (yPosition < margin + lineHeight) {
          page = coverLetterPdf.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        page.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
      }

      // Add spacing between paragraphs
      yPosition -= lineHeight * 0.5;
    }

    // Merge cover letter and resume PDFs
    const mergedPdf = await PDFDocument.create();

    // Copy cover letter pages
    const coverLetterPages = await mergedPdf.copyPages(
      coverLetterPdf,
      coverLetterPdf.getPageIndices()
    );
    for (const page of coverLetterPages) {
      mergedPdf.addPage(page);
    }

    // Copy resume pages
    const resumePdf = await PDFDocument.load(resumePdfBytes);
    const resumePages = await mergedPdf.copyPages(
      resumePdf,
      resumePdf.getPageIndices()
    );
    for (const page of resumePages) {
      mergedPdf.addPage(page);
    }

    // Generate final PDF bytes
    const mergedPdfBytes = await mergedPdf.save();

    // Return PDF as download (convert Uint8Array to Buffer for NextResponse)
    return new NextResponse(Buffer.from(mergedPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="CoverLetter+Resume.pdf"',
      },
    });
  } catch (error) {
    console.error('Error in /api/cover-letter/export:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred during PDF generation' },
      { status: 500 }
    );
  }
}
