"""
Build the "in Python" walkthrough lessons of the Unsupervised Lab.

For each lesson in tools/walkthrough_content.py this script:
  1. builds a Jupyter notebook (code cells + "line by line" explanation cells),
  2. executes it, so the notebook in the repository ships with real outputs,
  3. renders an HTML page for the website from the executed notebook,
     saving every plot as a PNG in assets/img/nb/.

The website and the notebooks therefore always show the same code and results.

Usage:  python tools/build_walkthroughs.py
Author: Eng. Saeed Serwan Abdulsattar
"""

import base64
import html
import re
import sys
from pathlib import Path

import markdown
import nbformat as nbf
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from walkthrough_content import LESSONS, DATA as DATA_URL  # noqa: E402

SITE = "https://saeedserwan.github.io/unsupervised"
REPO = "https://github.com/SaeedSerwan/unsupervised"
COLAB = "https://colab.research.google.com/github/SaeedSerwan/unsupervised/blob/main/notebooks"
IMG_DIR = ROOT / "assets" / "img" / "nb"
DPI_OUT = 2470 / 7   # pixels per inch of the retina PNGs that the notebook produces (measured)

from site_shell import TABS, tabs_html, header_html, FOOTER, head_html  # noqa: E402


# ------------------------------------------------------------------ parsing
NOTE_RE = re.compile(r"\s+# >>(\^?)\s?(.*)$")


def parse_code(src):
    """Split a code cell into lines and their explanations."""
    lines, notes = [], []
    for raw in src.split("\n"):
        m = NOTE_RE.search(raw)
        if m:
            code = raw[: m.start()]
            if m.group(1) == "^":
                nid = notes[-1]["id"]
                notes[-1]["lines"].append(len(lines))
            else:
                notes.append({"id": len(notes) + 1, "text": m.group(2).strip(), "lines": [len(lines)]})
                nid = len(notes)
        else:
            code, nid = raw, None
        lines.append({"code": code.rstrip(), "note": nid})
    while lines and not lines[-1]["code"].strip():
        lines.pop()
    return lines, notes


# --------------------------------------------------------------- markdown
MATH_RE = re.compile(r"\$\$.+?\$\$|\$[^$\n]+?\$", re.S)


def md_to_html(text):
    """Markdown → HTML, protecting $…$ maths from the markdown parser."""
    store = []

    def keep(m):
        store.append(m.group(0))
        return f"MATHTOKEN{len(store) - 1}END"

    out = markdown.markdown(MATH_RE.sub(keep, text), extensions=["tables", "fenced_code"])
    out = re.sub(r"MATHTOKEN(\d+)END", lambda m: html.escape(store[int(m.group(1))]), out)
    return out.replace("<table>", '<div class="table-wrap md-table"><table class="cheat">').replace("</table>", "</table></div>")


def slugify(s):
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# ------------------------------------------------------- python highlighting
TOKEN_RE = re.compile(
    r"(#[^\n]*)"
    r"|(f?\"(?:[^\"\\\n]|\\.)*\"|f?'(?:[^'\\\n]|\\.)*')"
    r"|\b(import|from|as|for|in|def|return|if|else|elif|lambda|True|False|None|and|or|not|with)\b"
    r"|(%config)"
    r"|\b(\d+(?:\.\d+)?(?:e[-+]?\d+)?)\b"
    r"|\b([A-Za-z_]\w*)(?=\()"
)


def highlight(line):
    out, last = [], 0
    for m in TOKEN_RE.finditer(line):
        out.append(html.escape(line[last : m.start()]))
        cls = "c" if m.group(1) else "s" if m.group(2) else "k" if (m.group(3) or m.group(4)) else "n" if m.group(5) else "f"
        out.append(f'<span class="{cls}">{html.escape(m.group(0))}</span>')
        last = m.end()
    out.append(html.escape(line[last:]))
    return "".join(out)


# ------------------------------------------------------------- notebook
def build_notebook(lesson):
    nb = nbf.v4.new_notebook()
    learn = "\n".join(f"{i}. {x}" for i, x in enumerate(lesson["learn"], 1))
    intro = (
        f"# {lesson['doc_title']}\n\n"
        f"**Unsupervised Lab · CSIT843A Lecture 4** · College of Computer Studies, University of Technology Bahrain  \n"
        f"Prepared by **Eng. Saeed Serwan Abdulsattar**\n\n"
        f"Interactive version with hover-to-explain code: **{SITE}/{lesson['page']}**\n\n"
        f"{re.sub('<[^>]+>', '', lesson['lead'])}\n\n**You will learn to:**\n\n{learn}\n\n"
        f"> Run the cells from top to bottom (Shift + Enter). After each code cell, a **Line by line** note explains what every line does."
    )
    nb.cells.append(nbf.v4.new_markdown_cell(intro))
    code_index = []  # positions of code cells inside nb.cells, in lesson order
    for kind, text in lesson["cells"]:
        if kind == "md":
            nb.cells.append(nbf.v4.new_markdown_cell(text))
            continue
        lines, notes = parse_code(text)
        nb.cells.append(nbf.v4.new_code_cell("\n".join(l["code"] for l in lines)))
        code_index.append(len(nb.cells) - 1)
        bullets = []
        for n in notes:
            first = lines[n["lines"][0]]["code"].strip()
            more = " …" if len(n["lines"]) > 1 else ""
            bullets.append(f"{n['id']}. `{first}`{more}  \n   {n['text']}")
        nb.cells.append(nbf.v4.new_markdown_cell("**Line by line**\n\n" + "\n".join(bullets)))
    nb.metadata["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
    nb.metadata["language_info"] = {"name": "python"}
    return nb, code_index


def execute(nb):
    """Run the notebook. While building, a hidden first cell makes pandas read the CSV files
    from data/ instead of GitHub, so the build works offline and before the repository is pushed.
    The helper cell is removed again and the execution counts are renumbered from 1."""
    data = (ROOT / "data").as_posix()
    patch = nbf.v4.new_code_cell(
        "import pandas as _pd\n_read = _pd.read_csv\n"
        f"_pd.read_csv = lambda f, *a, **k: _read(str(f).replace({DATA_URL!r}, {data!r}), *a, **k)"
    )
    nb.cells.insert(0, patch)
    NotebookClient(nb, timeout=600, kernel_name="python3",
                   resources={"metadata": {"path": str(ROOT / "notebooks")}}).execute()
    nb.cells.pop(0)
    for c in nb.cells:
        if c.cell_type == "code" and c.get("execution_count"):
            c.execution_count -= 1
            for o in c.get("outputs", []):
                if o.get("execution_count"):
                    o["execution_count"] -= 1
    return nb


# ---------------------------------------------------------------- outputs
def compress_png(path):
    """Resize a chart to 2x its display size and reduce it to a 256-colour palette.
    Returns the display (CSS) width and height: a 7-inch-wide figure is shown 640 px wide."""
    from PIL import Image
    im = Image.open(path).convert("RGB")
    k = 640 / (7 * DPI_OUT)
    w, h = round(im.width * k), round(im.height * k)
    im = im.resize((2 * w, 2 * h), Image.LANCZOS)
    im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
    return w, h

def render_outputs(cell, slug, img_counter):
    parts = []
    for o in cell.get("outputs", []):
        t = o["output_type"]
        if t == "stream":
            parts.append(f'<pre class="nb-stream">{html.escape(o["text"].rstrip())}</pre>')
        elif t in ("execute_result", "display_data"):
            data = o["data"]
            if "image/png" in data:
                img_counter[0] += 1
                name = f"{slug}-{img_counter[0]:02d}.png"
                path = IMG_DIR / name
                path.write_bytes(base64.b64decode(data["image/png"]))
                w, h = compress_png(path)
                size = f' width="{w}" height="{h}"'
                parts.append(f'<img class="nb-img" src="assets/img/nb/{name}"{size} loading="lazy" alt="Chart produced by this cell">')
            elif "text/html" in data:
                h = re.sub(r"<style.*?</style>", "", data["text/html"], flags=re.S)
                h = h.replace('border="1" ', "")
                parts.append(f'<div class="nb-html">{h}</div>')
            elif "text/plain" in data:
                parts.append(f'<pre class="nb-stream">{html.escape(data["text/plain"])}</pre>')
        elif t == "error":
            raise RuntimeError(f"Cell failed: {o['ename']}: {o['evalue']}")
    return "\n".join(parts)


def code_cell_html(lines, notes, exec_cell, slug, img_counter):
    n_exec = exec_cell.get("execution_count") or ""
    items = []
    for l in lines:
        code = highlight(l["code"]) if l["code"] else "&#8203;"
        if l["note"]:
            items.append(f'<li data-note="{l["note"]}" tabindex="0"><span class="code">{code}</span><span class="mk">{l["note"]}</span></li>')
        else:
            items.append(f'<li><span class="code">{code}</span></li>')
    note_items = "".join(f'<li data-note="{n["id"]}"><span class="mk">{n["id"]}</span><span>{md_inline(n["text"])}</span></li>' for n in notes)
    plain = html.escape("\n".join(l["code"] for l in lines))
    outputs = render_outputs(exec_cell, slug, img_counter)
    out_html = f'<div class="nb-out"><span class="prompt out">Out [{n_exec}]</span><div class="nb-out-body">{outputs}</div></div>' if outputs else ""
    return f"""
<div class="nb-cell">
  <div class="nb-io">
    <div class="nb-in">
      <div class="nb-in-head"><span class="prompt">In [{n_exec}]</span><button class="btn small ghost nb-copy" data-code="{plain}">Copy</button></div>
      <div class="nb-code">
        <ol class="code-lines">{"".join(items)}</ol>
      </div>
    </div>
    <aside class="nb-notes"><p class="nb-notes-title">Line by line</p><ol>{note_items}</ol></aside>
  </div>
  {out_html}
</div>"""


def md_inline(text):
    """Inline markdown for explanations (`code`, **bold**, *italic*)."""
    t = html.escape(text)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\w*])\*([^*]+)\*(?!\w)", r"<em>\1</em>", t)
    return t


# ------------------------------------------------------------------- page
NEXT = {
    "clustering": ("code-pca.html", "Next notebook", "PCA in Python →", "Standardise, fit PCA, read the scree plot and choose the number of components."),
    "pca": ("index.html", "Back to the start", "← Overview", "Revisit the interactive lessons on K-means, hierarchical clustering and PCA."),
}


def build_page(lesson, nb, code_index):
    slug = lesson["slug"]
    for f in IMG_DIR.glob(f"{slug}-*.png"):
        f.unlink()
    img_counter = [0]
    sections, toc = [], []
    current = None

    def new_section(title_html):
        nonlocal current
        m = re.match(r"(\d+)\.\s*(.*)", title_html)
        num, title = (m.group(1), m.group(2)) if m else ("", title_html)
        sid = slugify(title)
        toc.append((sid, re.sub(r"<[^>]+>", "", title)))
        chip = f'<span class="chap">{num}</span>' if num else ""
        current = [f'<section id="{sid}" class="chapter">\n<h2>{chip}{title}</h2>']
        sections.append(current)

    ci = 0
    for kind, text in lesson["cells"]:
        if kind == "md":
            chunks = re.split(r"(?m)^(?=## )", text)
            for chunk in chunks:
                if not chunk.strip():
                    continue
                if chunk.startswith("## "):
                    head, _, body = chunk.partition("\n")
                    new_section(html.escape(head[3:].strip()))
                    chunk = body
                if chunk.strip():
                    current.append(f'<div class="nb-md">{md_to_html(chunk)}</div>')
        else:
            lines, notes = parse_code(text)
            current.append(code_cell_html(lines, notes, nb.cells[code_index[ci]], slug, img_counter))
            ci += 1

    body = "\n".join("\n".join(s) + "\n</section>" for s in sections)
    toc_html = "\n".join(f'      <li><a href="#{sid}">{html.escape(t)}</a></li>' for sid, t in toc)
    learn = "\n".join(f'        <div><span class="num">{i:02d}</span>{x}</div>' for i, x in enumerate(lesson["learn"], 1))
    nbname = lesson["notebook"]

    nxt = NEXT[slug]
    page = f"""<!DOCTYPE html>
<html lang="en">
{head_html(lesson['doc_title'] + ' · Unsupervised Lab', re.sub('<[^>]+>', '', lesson['lead']))}
<body class="walkthrough">
<!-- Generated by tools/build_walkthroughs.py from tools/walkthrough_content.py. Edit those, not this file. -->

{header_html(lesson['page'])}

<div class="layout">
  <aside class="toc" aria-label="Contents">
    <p class="toc-title">Notebook</p>
    <ol>
{toc_html}
    </ol>
  </aside>

  <main>
    <section class="hero">
      <p class="eyebrow">{lesson['eyebrow']}</p>
      <h1>{lesson['title']}</h1>
      <p class="lead">{lesson['lead']}</p>
      <div class="nb-actions">
        <a class="btn" href="{COLAB}/{nbname}" target="_blank" rel="noopener">Open in Google Colab</a>
        <a class="btn ghost" href="notebooks/{nbname}" download>Download notebook (.ipynb)</a>
        <a class="btn ghost" href="data/{lesson['dataset']}" download>Download dataset (.csv)</a>
        <button class="btn ghost" id="copy-all">Copy all code</button>
      </div>
      <div class="learn-grid">
{learn}
      </div>
      <p class="nb-howto"><span class="mk">1</span> Hover over or tap any numbered line of code to highlight its explanation. Every output and chart below was produced by running this exact notebook.</p>
    </section>
{body}
    <a class="next-card" href="{nxt[0]}">
      <span class="next-eyebrow">{nxt[1]}</span>
      <span class="next-title">{nxt[2]}</span>
      <span class="next-text">{nxt[3]}</span>
    </a>
  </main>
</div>

{FOOTER}

<script src="assets/vendor/katex/katex.min.js"></script>
<script src="assets/vendor/katex/auto-render.min.js"></script>
<script src="assets/js/lib.js"></script>
<script src="assets/js/walkthrough.js"></script>
</body>
</html>
"""
    (ROOT / lesson["page"]).write_text(page, encoding="utf-8")
    return img_counter[0]


def update_other_pages():
    """Keep the lesson tabs identical on the hand-written pages."""
    for page, _ in TABS:
        p = ROOT / page
        if not p.exists() or page.startswith("code-"):
            continue
        s = p.read_text(encoding="utf-8")
        s = re.sub(r'<nav class="page-tabs".*?</nav>', tabs_html(page), s, flags=re.S)
        p.write_text(s, encoding="utf-8")


def main():
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    for lesson in LESSONS:
        nb, code_index = build_notebook(lesson)
        print(f"Executing {lesson['notebook']} …")
        execute(nb)
        nbf.write(nb, ROOT / "notebooks" / lesson["notebook"])
        n_img = build_page(lesson, nb, code_index)
        print(f"  → notebooks/{lesson['notebook']}, {lesson['page']} ({n_img} charts)")
    update_other_pages()


if __name__ == "__main__":
    main()
