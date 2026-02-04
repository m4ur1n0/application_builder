import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ScrapeResult {
  title?: string;
  company?: string;
  location?: string;
  descriptionText: string;
  usedFallback?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Fetch the HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobApplicationBot/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const result = scrapeJobPosting($, parsedUrl);

    if (!result.descriptionText || result.descriptionText.length < 100) {
      return NextResponse.json(
        {
          error: 'Could not extract meaningful job description. Please paste the job description manually.',
          details: 'The scraper could not confidently extract the job description from this page.'
        },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/scrape-job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Main scraping function that uses site-specific selectors and fallback heuristics
 */
function scrapeJobPosting($: cheerio.CheerioAPI, url: URL): ScrapeResult {
  const hostname = url.hostname.toLowerCase();

  // Try site-specific extractors
  let result: ScrapeResult | null = null;

  if (hostname.includes('greenhouse')) {
    result = scrapeGreenhouse($);
  } else if (hostname.includes('lever')) {
    result = scrapeLever($);
  } else if (hostname.includes('ashby')) {
    result = scrapeAshby($);
  } else if (hostname.includes('workday')) {
    result = scrapeWorkday($);
  }

  // If site-specific extraction got good content, return it
  if (result && result.descriptionText.length > 200) {
    return result;
  }

  // Otherwise, use generic fallback
  console.log('Site-specific extraction failed, using fallback');
  return scrapeGeneric($, true);
}

/**
 * Greenhouse-specific scraper
 */
function scrapeGreenhouse($: cheerio.CheerioAPI): ScrapeResult {
  console.log('Trying Greenhouse extraction');

  const title = $('h1.app-title').first().text().trim() ||
                $('.job-title').first().text().trim() ||
                $('h1').first().text().trim();

  const company = $('.company-name').first().text().trim();
  const location = $('.location').first().text().trim();

  // Find content container
  const contentContainer = $('#content, .content, main, [class*="job-post"], body').first();

  // Clone and remove unwanted elements
  const $clone = contentContainer.clone();
  $clone.find('form, #application_form, .application-form, [id*="apply"], [class*="apply-button"]').remove();
  $clone.find('script, style, nav, header.site-header, footer').remove();
  $clone.find('input[type="file"], input[name*="name"], input[name*="email"]').closest('*').remove();

  const descriptionText = extractText($clone);

  return {
    title,
    company,
    location,
    descriptionText: cleanText(descriptionText),
    usedFallback: false,
  };
}

/**
 * Lever-specific scraper
 */
function scrapeLever($: cheerio.CheerioAPI): ScrapeResult {
  console.log('Trying Lever extraction');

  const title = $('.posting-headline h2').first().text().trim() ||
                $('h2').first().text().trim();

  const company = $('.main-header-text-logo img').attr('alt') ||
                  $('.company-name').first().text().trim();

  const location = $('.posting-categories .location').first().text().trim();

  const postingContent = $('.posting, .content, main, body').first();
  const $clone = postingContent.clone();

  $clone.find('form, .application-form, script, style, nav, header, footer').remove();

  const descriptionText = extractText($clone);

  return {
    title,
    company,
    location,
    descriptionText: cleanText(descriptionText),
    usedFallback: false,
  };
}

/**
 * Ashby-specific scraper
 */
function scrapeAshby($: cheerio.CheerioAPI): ScrapeResult {
  console.log('Trying Ashby extraction');

  const title = $('h1').first().text().trim() ||
                $('h2').first().text().trim();

  const company = $('[class*="company"]').first().text().trim();
  const location = $('[class*="location"]').first().text().trim();

  const mainContent = $('main, [role="main"], #root, body').first();
  const $clone = mainContent.clone();

  $clone.find('form, nav, header, footer, script, style, button[type="submit"]').remove();
  $clone.find('[class*="apply"], [class*="Apply"], [class*="button"]').filter((_, el) => {
    return $(el).text().toLowerCase().includes('apply');
  }).remove();

  const descriptionText = extractText($clone);

  return {
    title,
    company,
    location,
    descriptionText: cleanText(descriptionText),
    usedFallback: false,
  };
}

/**
 * Workday-specific scraper
 */
function scrapeWorkday($: cheerio.CheerioAPI): ScrapeResult {
  console.log('Trying Workday extraction');

  const title = $('h2[data-automation-id="jobPostingHeader"]').first().text().trim() ||
                $('h1').first().text().trim();

  const company = $('[data-automation-id="company"]').first().text().trim();
  const location = $('[data-automation-id="locations"]').first().text().trim();

  const descriptionContainer = $('[data-automation-id="jobPostingDescription"], .job-description, main').first();

  const descriptionText = extractText(descriptionContainer);

  return {
    title,
    company,
    location,
    descriptionText: cleanText(descriptionText),
    usedFallback: false,
  };
}

/**
 * Generic heuristic-based scraper for unknown job boards
 */
function scrapeGeneric($: cheerio.CheerioAPI, usedFallback: boolean): ScrapeResult {
  console.log('Using generic extraction');

  const title = $('h1').first().text().trim();

  const company = $('[property="og:site_name"]').attr('content') ||
                  $('.company-name').first().text().trim() ||
                  $('[class*="company"]').first().text().trim();

  const location = $('[itemprop="jobLocation"]').first().text().trim() ||
                   $('.location').first().text().trim() ||
                   $('[class*="location"]').first().text().trim();

  // Find best content container
  const candidates: Array<{ element: cheerio.Cheerio<any>; text: string; score: number }> = [];

  $('main, article, [role="main"], section, div').each((_, el) => {
    const $el = $(el);
    const $clone = $el.clone();

    // Remove unwanted elements
    $clone.find('nav, header, footer, aside, script, style, form, button, input, select, textarea').remove();
    $clone.find('[class*="nav"], [class*="header"], [class*="footer"], [class*="sidebar"]').remove();

    // Remove application sections
    $clone.find('*').filter((_: any, node: any) => {
      const text = $(node).text().toLowerCase();

      const isFormSection = text.includes('first name') ||
                           text.includes('last name') ||
                           text.includes('email address') ||
                           text.includes('resume/cv') ||
                           text.includes('cover letter');

      const isSmallSection = ($(node).text().length || 0) < 500;

      return isFormSection && isSmallSection;
    }).remove();

    // Remove job alerts, EEO statements
    $clone.find('*').filter((_: any, node: any) => {
      const text = $(node).text().toLowerCase();
      return text.includes('create job alert') ||
             text.includes('sign up for alerts') ||
             text.includes('equal opportunity employer') ||
             text.includes('eeo is the law') ||
             text.includes('powered by') ||
             text.includes('share this job');
    }).remove();

    const text = $clone.text();
    const textLength = text.trim().length;
    const meaningfulElements = $clone.find('p, li, h2, h3, h4').length;
    const score = textLength * 0.7 + meaningfulElements * 50;

    candidates.push({ element: $el, text, score });
  });

  // Sort by score
  candidates.sort((a, b) => b.score - a.score);

  // Try top 3 candidates
  for (const candidate of candidates.slice(0, 3)) {
    if (candidate.text.trim().length > 200) {
      const $clone = candidate.element.clone();
      $clone.find('nav, header, footer, aside, script, style, form, button[type="submit"]').remove();

      const descriptionText = extractText($clone);
      const cleaned = cleanText(descriptionText);

      if (cleaned.length > 200) {
        return {
          title,
          company,
          location,
          descriptionText: cleaned,
          usedFallback,
        };
      }
    }
  }

  // Final fallback: grab all body text
  console.log('Using final aggressive fallback');

  const $body = $('body').clone();
  $body.find('script, style, noscript, iframe, form, input, select, textarea, button').remove();

  const allText = extractText($body);
  const cleaned = cleanText(allText);

  if (cleaned.length > 100) {
    return {
      title,
      company,
      location,
      descriptionText: cleaned,
      usedFallback: true,
    };
  }

  return {
    title,
    company,
    location,
    descriptionText: '',
    usedFallback,
  };
}

/**
 * Extract text from Cheerio element, preserving structure
 */
function extractText($element: cheerio.Cheerio<any>): string {
  const parts: string[] = [];

  function walk($node: cheerio.Cheerio<any>): void {
    $node.contents().each((_: any, el: any) => {
      if (el.type === 'text') {
        const text = (el.data || '').trim();
        if (text) {
          parts.push(text);
        }
        return;
      }

      if (el.type !== 'tag') return;

      const $el = cheerio.load(el)('*').first();
      const tagName = el.name?.toLowerCase();

      // Skip unwanted
      if (['script', 'style', 'svg', 'path'].includes(tagName)) {
        return;
      }

      // Headings
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        const text = $el.text().trim();
        if (text && text.length > 1) {
          parts.push('\n\n' + text + '\n');
        }
        return;
      }

      // Paragraphs
      if (tagName === 'p') {
        const text = $el.text().trim();
        if (text) {
          parts.push('\n' + text);
        }
        return;
      }

      // List items
      if (tagName === 'li') {
        const text = $el.text().trim();
        if (text) {
          parts.push('\n• ' + text);
        }
        return;
      }

      // Line breaks
      if (tagName === 'br') {
        parts.push('\n');
        return;
      }

      // Recurse for containers
      if (['div', 'section', 'article'].includes(tagName)) {
        walk($el);
        return;
      }

      // Recurse for others
      walk($el);
    });
  }

  walk($element);
  return parts.join('');
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text: string): string {
  let cleaned = text
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n')
    .replace(/\n /g, '\n')
    .trim();

  // Filter out UI chrome
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const lower = line.toLowerCase().trim();
    if (lower.length < 3) return false;
    if (['home', 'careers', 'jobs', 'search', 'menu', 'close'].includes(lower)) {
      return false;
    }
    return true;
  });

  cleaned = filteredLines.join('\n');

  // Remove duplicate consecutive lines
  const uniqueLines: string[] = [];
  let prevLine = '';

  for (const line of cleaned.split('\n')) {
    const normalized = line.trim();
    if (normalized !== prevLine || normalized.length < 10) {
      uniqueLines.push(line);
    }
    prevLine = normalized;
  }

  cleaned = uniqueLines.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Cap at reasonable size
  if (cleaned.length > 60000) {
    cleaned = cleaned.substring(0, 60000) + '\n\n[Content truncated for length]';
  }

  return cleaned;
}
