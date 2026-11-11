"""
Shared header, footer and <head> for every page of the Unsupervised Lab.
Used by tools/build_walkthroughs.py (and to keep the lesson tabs in sync).

Author: Eng. Saeed Serwan Abdulsattar
"""

TABS = [("index.html","Overview"),("kmeans.html","K-means"),("hierarchical.html","Hierarchical"),("pca.html","PCA"),("beyond.html","Beyond the lecture"),("code-clustering.html","Clustering in Python"),("code-pca.html","PCA in Python")]
REPO = "https://github.com/SaeedSerwan/unsupervised"
GH = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>'
def tabs_html(active):
    on=' class="active" aria-current="page"'
    return '<nav class="page-tabs" aria-label="Lessons">\n' + "\n".join(f'    <a href="{h}"{on if h==active else ""}>{l}</a>' for h,l in TABS) + '\n  </nav>'
def header_html(active):
    return f'''<header class="site-header">
  <a class="brand" href="index.html">
    <img class="brand-logo" src="assets/img/utb-logo.svg" alt="University of Technology Bahrain logo" onerror="this.remove()">
    <span class="brand-title">Unsupervised Lab</span>
  </a>
  {tabs_html(active)}
  <nav class="top-links">
    <a href="{REPO}" target="_blank" rel="noopener">{GH}GitHub</a>
  </nav>
</header>'''
FOOTER = f'''<footer class="site-footer">
  <div class="footer-inner">
    <img class="footer-logo" src="assets/img/utb-logo.svg" alt="" onerror="this.remove()">
    <div>
      <p><strong>Unsupervised Lab</strong>: an open, interactive companion to <em>CSIT843A Lecture 4: Unsupervised Learning</em>.</p>
      <p>Created by <strong>Eng. Saeed Serwan Abdulsattar</strong>, College of Computer Studies, University of Technology Bahrain.</p>
      <p><a href="{REPO}" target="_blank" rel="noopener">Source on GitHub</a> · MIT License</p>
    </div>
  </div>
</footer>'''
def head_html(title, desc):
    return f'''<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="author" content="Eng. Saeed Serwan Abdulsattar">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="assets/img/favicon-512.png">
  <meta name="theme-color" content="#ffffff">
  <link rel="icon" type="image/svg+xml" href="assets/img/utb-logo.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="assets/img/favicon-32.png">
  <link rel="apple-touch-icon" href="assets/img/favicon-180.png">
  <link rel="stylesheet" href="assets/vendor/katex/katex.min.css">
  <link rel="stylesheet" href="assets/css/style.css">
</head>'''
