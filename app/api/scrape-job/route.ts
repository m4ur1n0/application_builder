import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

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
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const result = scrapeJobPosting(document, parsedUrl);
    console.log(result, JSON.stringify(result))

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
function scrapeJobPosting(document: Document, url: URL): ScrapeResult {
  const hostname = url.hostname.toLowerCase();

  // Try site-specific extractors, but fallback if they fail
  let result: ScrapeResult | null = null;

  if (hostname.includes('greenhouse')) {
    result = scrapeGreenhouse(document);
  } else if (hostname.includes('lever')) {
    result = scrapeLever(document);
  } else if (hostname.includes('ashby')) {
    result = scrapeAshby(document);
  } else if (hostname.includes('workday')) {
    result = scrapeWorkday(document);
  }

  // If site-specific extraction got good content, return it
  if (result && result.descriptionText.length > 200) {
    return result;
  }

  // Otherwise, use generic fallback
  console.log('Site-specific extraction failed or yielded insufficient content, using fallback');
  return scrapeGeneric(document, true);
}

/**
 * Greenhouse-specific scraper
 */
function scrapeGreenhouse(document: Document): ScrapeResult {
  console.log('Trying Greenhouse extraction');

  // Try multiple title selectors
  const title = document.querySelector('h1.app-title')?.textContent?.trim() ||
                document.querySelector('.job-title')?.textContent?.trim() ||
                document.querySelector('h1')?.textContent?.trim();

  const company = document.querySelector('.company-name')?.textContent?.trim();
  const location = document.querySelector('.location')?.textContent?.trim();

  // Try to find the main content area
  let contentContainer = document.querySelector('#content') ||
                        document.querySelector('.content') ||
                        document.querySelector('main') ||
                        document.querySelector('[class*="job-post"]') ||
                        document.querySelector('body');

  if (!contentContainer) {
    return { descriptionText: '', usedFallback: false };
  }

  // Clone to avoid modifying original
  const clone = contentContainer.cloneNode(true) as Element;

  // Remove application forms and unwanted sections
  clone.querySelectorAll('form, #application_form, .application-form, [id*="apply"], [class*="apply-button"]').forEach(el => el.remove());
  clone.querySelectorAll('script, style, nav, header.site-header, footer').forEach(el => el.remove());

  // Remove elements that contain form inputs
  clone.querySelectorAll('*').forEach(el => {
    if (el.querySelector('input[type="file"]') ||
        el.querySelector('input[name*="name"]') ||
        el.querySelector('input[name*="email"]')) {
      el.remove();
    }
  });

  const descriptionText = extractTextFromElement(clone);

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
function scrapeLever(document: Document): ScrapeResult {
  console.log('Trying Lever extraction');

  const title = document.querySelector('.posting-headline h2')?.textContent?.trim() ||
                document.querySelector('h2')?.textContent?.trim();

  const company = document.querySelector('.main-header-text-logo img')?.getAttribute('alt') ||
                  document.querySelector('.company-name')?.textContent?.trim();

  const location = document.querySelector('.posting-categories .location')?.textContent?.trim();

  const postingContent = document.querySelector('.posting') ||
                        document.querySelector('.content') ||
                        document.querySelector('main') ||
                        document.querySelector('body');

  if (!postingContent) {
    return { descriptionText: '', usedFallback: false };
  }

  const clone = postingContent.cloneNode(true) as Element;

  // Remove forms and unwanted elements
  clone.querySelectorAll('form, .application-form, script, style, nav, header, footer').forEach(el => el.remove());

  const descriptionText = extractTextFromElement(clone);

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
function scrapeAshby(document: Document): ScrapeResult {
  console.log('Trying Ashby extraction');

  const title = document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('h2')?.textContent?.trim();

  const company = document.querySelector('[class*="company"]')?.textContent?.trim();
  const location = document.querySelector('[class*="location"]')?.textContent?.trim();

  // Ashby uses React, so we need to be more aggressive
  const mainContent = document.querySelector('main') ||
                     document.querySelector('[role="main"]') ||
                     document.querySelector('#root') ||
                     document.querySelector('body');

  if (!mainContent) {
    return { descriptionText: '', usedFallback: false };
  }

  const clone = mainContent.cloneNode(true) as Element;

  // Remove forms, navigation, and unwanted sections
  clone.querySelectorAll('form, nav, header, footer, script, style, button[type="submit"]').forEach(el => el.remove());
  clone.querySelectorAll('[class*="apply"], [class*="Apply"], [class*="button"]').forEach(el => {
    if (el.textContent?.toLowerCase().includes('apply')) {
      el.remove();
    }
  });

  const descriptionText = extractTextFromElement(clone);

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
function scrapeWorkday(document: Document): ScrapeResult {
  console.log('Trying Workday extraction');

  const title = document.querySelector('h2[data-automation-id="jobPostingHeader"]')?.textContent?.trim() ||
                document.querySelector('h1')?.textContent?.trim();

  const company = document.querySelector('[data-automation-id="company"]')?.textContent?.trim();
  const location = document.querySelector('[data-automation-id="locations"]')?.textContent?.trim();

  const descriptionContainer = document.querySelector('[data-automation-id="jobPostingDescription"]') ||
                               document.querySelector('.job-description') ||
                               document.querySelector('main');

  if (!descriptionContainer) {
    return { descriptionText: '', usedFallback: false };
  }

  const descriptionText = extractTextFromElement(descriptionContainer);

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
 * Uses smart content detection to find the job description
 */
function scrapeGeneric(document: Document, usedFallback: boolean): ScrapeResult {
  console.log('Using generic extraction');

  const title = document.querySelector('h1')?.textContent?.trim();

  const company = document.querySelector('[property="og:site_name"]')?.getAttribute('content') ||
                  document.querySelector('.company-name')?.textContent?.trim() ||
                  document.querySelector('[class*="company"]')?.textContent?.trim();

  const location = document.querySelector('[itemprop="jobLocation"]')?.textContent?.trim() ||
                   document.querySelector('.location')?.textContent?.trim() ||
                   document.querySelector('[class*="location"]')?.textContent?.trim();

  // Strategy: Find all potential content containers and score them
  const allElements = Array.from(document.querySelectorAll('main, article, [role="main"], section, div'));

  const candidates = allElements.map(el => {
    const clone = el.cloneNode(true) as Element;

    // Remove obvious non-content elements
    clone.querySelectorAll('nav, header, footer, aside, script, style, form').forEach(n => n.remove());
    clone.querySelectorAll('button, input, select, textarea').forEach(n => n.remove());
    clone.querySelectorAll('[class*="nav"], [class*="header"], [class*="footer"], [class*="sidebar"]').forEach(n => n.remove());

    // Remove elements that look like application sections
    clone.querySelectorAll('*').forEach(node => {
      const text = node.textContent?.toLowerCase() || '';
      const classList = Array.from(node.classList || []).join(' ').toLowerCase();

      if (
        text.includes('first name') ||
        text.includes('last name') ||
        text.includes('email address') ||
        text.includes('resume/cv') ||
        text.includes('cover letter') ||
        text.includes('linkedin profile') ||
        classList.includes('apply') ||
        classList.includes('application') ||
        classList.includes('submit')
      ) {
        // Only remove if it's a small section (likely a form)
        if ((node.textContent?.length || 0) < 500) {
          node.remove();
        }
      }

      // Remove job alerts, EEO statements
      if (
        text.includes('create job alert') ||
        text.includes('sign up for alerts') ||
        text.includes('equal opportunity employer') ||
        text.includes('eeo is the law') ||
        text.includes('powered by') ||
        text.includes('share this job')
      ) {
        node.remove();
      }
    });

    const text = clone.textContent || '';
    const textLength = text.trim().length;

    // Count meaningful elements (p, li, h2, h3)
    const meaningfulElements = clone.querySelectorAll('p, li, h2, h3, h4').length;

    // Score based on text length and structure
    const score = textLength * 0.7 + meaningfulElements * 50;

    return {
      element: el,
      text,
      textLength,
      score,
    };
  });

  // Sort by score and take the best
  candidates.sort((a, b) => b.score - a.score);

  // Try the top 3 candidates and pick the first one with substantial content
  for (const candidate of candidates.slice(0, 3)) {
    if (candidate.textLength > 200) {
      console.log(`Selected candidate with ${candidate.textLength} chars, score: ${candidate.score}`);

      const clone = candidate.element.cloneNode(true) as Element;

      // Final cleanup
      clone.querySelectorAll('nav, header, footer, aside, script, style, form, button[type="submit"]').forEach(el => el.remove());

      const descriptionText = extractTextFromElement(clone);
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

  // Final fallback: just grab all text from body, minimal filtering
  console.log('Using final aggressive fallback - grabbing all body text');

  const body = document.querySelector('body');
  if (body) {
    const bodyClone = body.cloneNode(true) as Element;

    // Only remove the most essential non-content elements
    bodyClone.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());

    // Remove obvious form elements (but keep the rest)
    bodyClone.querySelectorAll('form, input, select, textarea, button').forEach(el => el.remove());

    const allText = extractTextFromElement(bodyClone);
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
  }

  // If even that failed, return empty
  return {
    title,
    company,
    location,
    descriptionText: '',
    usedFallback,
  };
}

/**
 * Extract text from an element, preserving structure with headings and lists
 */
function extractTextFromElement(element: Element): string {
  const parts: string[] = [];

  function walk(node: Node, depth: number = 0): void {
    if (node.nodeType === 3) { // Text node
      const text = node.textContent?.trim();
      if (text) {
        parts.push(text);
      }
      return;
    }

    if (node.nodeType !== 1) return; // Not an element

    const el = node as Element;
    const tagName = el.tagName?.toLowerCase();

    // Skip unwanted elements
    if (['script', 'style', 'svg', 'path'].includes(tagName)) {
      return;
    }

    // Headings - add with extra spacing
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const text = el.textContent?.trim();
      if (text && text.length > 1) {
        parts.push('\n\n' + text);
        parts.push('\n');
      }
      return;
    }

    // Paragraphs
    if (tagName === 'p') {
      const text = el.textContent?.trim();
      if (text) {
        parts.push('\n' + text);
      }
      return;
    }

    // List items
    if (tagName === 'li') {
      const text = el.textContent?.trim();
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

    // Divs and sections - add spacing if they contain block content
    if (['div', 'section', 'article'].includes(tagName)) {
      // Recurse into children
      for (const child of Array.from(el.childNodes)) {
        walk(child, depth + 1);
      }
      return;
    }

    // For other elements, just recurse
    for (const child of Array.from(node.childNodes)) {
      walk(child, depth + 1);
    }
  }

  walk(element);

  return parts.join('');
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text: string): string {
  // Remove excessive whitespace
  let cleaned = text
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n')
    .replace(/\n /g, '\n')
    .trim();

  // Remove lines that are just navigation or UI elements
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const lower = line.toLowerCase().trim();

    // Remove very short lines that are likely UI chrome
    if (lower.length < 3) return false;

    // Remove common navigation items
    if (lower === 'home' || lower === 'careers' || lower === 'jobs' ||
        lower === 'search' || lower === 'menu' || lower === 'close') {
      return false;
    }

    return true;
  });

  cleaned = filteredLines.join('\n');

  // Remove duplicate consecutive lines (common in footers)
  const uniqueLines: string[] = [];
  let prevLine = '';

  for (const line of cleaned.split('\n')) {
    const normalized = line.trim();
    if (normalized !== prevLine || normalized.length < 10) {
      uniqueLines.push(line);
    }
    prevLine = normalized;
  }

  cleaned = uniqueLines.join('\n');

  // Final whitespace cleanup
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Cap at reasonable size (60k chars)
  if (cleaned.length > 60000) {
    cleaned = cleaned.substring(0, 60000) + '\n\n[Content truncated for length]';
  }

  return cleaned;
}
