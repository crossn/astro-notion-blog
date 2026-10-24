"""Verify an Astro dist directory; no network or third-party Python packages.

See docs/seo-discovery-maintenance.md for build/fixture commands.
"""
import argparse
from pathlib import Path
import re
import unittest
from urllib.parse import urlparse, unquote
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('--mode', choices=['production', 'preview', 'local'], required=True)
parser.add_argument('--site', required=True)
parser.add_argument('--articles', type=int, default=12)
parser.add_argument('--baseline', type=Path)
args = parser.parse_args()
dist = Path('dist')
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
html_files = sorted(dist.rglob('*.html'))


def sitemap_urls():
    index = ET.parse(dist / 'sitemap-index.xml')
    assert index.getroot().tag == '{%s}sitemapindex' % ns['s']
    urls = []
    for loc in index.findall('.//s:loc', ns):
        assert loc.text.startswith(args.site + '/')
        document = ET.parse(dist / Path(urlparse(loc.text).path).name)
        assert document.getroot().tag == '{%s}urlset' % ns['s']
        urls += [loc.text for loc in document.findall('.//s:loc', ns)]
    return urls


class DiscoveryBuild(unittest.TestCase):
    def test_robots(self):
        body = (dist / 'robots.txt').read_text()
        expected = (f'User-agent: *\nAllow: /\n\nSitemap: {args.site}/sitemap-index.xml\n'
                    if args.mode == 'production' else 'User-agent: *\nDisallow: /\n')
        self.assertEqual(body, expected)
        self.assertNotIn('<html', body)

    def test_sitemap_xml_and_origins(self):
        if args.mode != 'production':
            self.assertEqual(list(dist.glob('sitemap*.xml')), [])
            return
        urls = sitemap_urls()
        self.assertTrue(urls)
        self.assertEqual(len(urls), len(set(urls)))
        self.assertTrue(all(url.startswith(args.site + '/') for url in urls))
        self.assertTrue(all('localhost' not in url and '.pages.dev' not in url for url in urls))

    def test_sitemap_matches_existing_canonicals(self):
        canonicals = [re.search(r'<link rel="canonical" href="([^"]+)"', p.read_text())[1]
                      for p in html_files]
        self.assertTrue(all(c.startswith(args.site + '/') for c in canonicals))
        if args.mode == 'production':
            self.assertEqual(set(map(unquote, sitemap_urls())), set(map(unquote, canonicals)))

    def test_published_articles(self):
        rss_links = [e.text for e in ET.parse(dist / 'rss.xml').findall('.//item/link')]
        self.assertEqual(len(rss_links), args.articles)
        for link in rss_links:
            self.assertTrue(link.startswith(args.site + '/blog/'))
            self.assertTrue((dist / urlparse(link).path.lstrip('/') / 'index.html').is_file())
            if args.mode == 'production':
                self.assertIn(link, sitemap_urls())

    def test_unpublished_excluded(self):
        for slug in ['draft-fixture', 'future-fixture']:
            self.assertFalse((dist / 'blog' / slug).exists())
            for p in [*html_files, dist / 'feed', dist / 'rss.xml', *dist.glob('sitemap*.xml')]:
                self.assertNotIn(slug, p.read_text())

    def test_rss_compatibility(self):
        self.assertEqual((dist / 'feed').read_bytes(), (dist / 'rss.xml').read_bytes())
        self.assertEqual(ET.parse(dist / 'feed').getroot().tag, 'rss')

    def test_metadata(self):
        for p in html_files:
            text = p.read_text()
            for marker in ['name="description" content="', 'property="og:title" content="',
                           'property="og:image" content="']:
                self.assertIn(marker, text)
            canonical = re.search(r'<link rel="canonical" href="([^"]+)"', text)[1]
            self.assertIn(f'property="og:url" content="{canonical}"', text)

    def test_baseline_regression(self):
        if args.baseline is None:
            self.skipTest('Pass --baseline for a before/after byte comparison')
        previous = sorted(p.relative_to(args.baseline) for p in args.baseline.rglob('*.html'))
        self.assertEqual(previous, [p.relative_to(dist) for p in html_files])
        for relative in [*previous, Path('feed'), Path('rss.xml')]:
            self.assertEqual((dist / relative).read_bytes(), (args.baseline / relative).read_bytes(),
                             str(relative))


unittest.main(argv=['verify-seo-discovery'], verbosity=2)
