<p align="center">
  <img src="assets/img/utb-logo.svg" alt="University of Technology Bahrain" width="64">
</p>

<h1 align="center">Unsupervised Lab</h1>

<p align="center">
  <strong>An interactive, minimal website for learning unsupervised learning: K-means, hierarchical clustering and principal component analysis.</strong><br>
  Companion to <em>CSIT843A Artificial Intelligence and Machine Learning, Lecture 4: Unsupervised Learning</em><br>
  College of Computer Studies · University of Technology Bahrain
</p>

<p align="center">
  <a href="https://saeedserwan.github.io/unsupervised/"><strong>▶ Overview</strong></a> ·
  <a href="https://saeedserwan.github.io/unsupervised/kmeans.html"><strong>K-means</strong></a> ·
  <a href="https://saeedserwan.github.io/unsupervised/hierarchical.html"><strong>Hierarchical</strong></a> ·
  <a href="https://saeedserwan.github.io/unsupervised/pca.html"><strong>PCA</strong></a> ·
  <a href="https://saeedserwan.github.io/unsupervised/beyond.html"><strong>Beyond the lecture</strong></a><br>
  <a href="https://saeedserwan.github.io/unsupervised/code-clustering.html">Clustering in Python</a> ·
  <a href="https://saeedserwan.github.io/unsupervised/code-pca.html">PCA in Python</a> ·
  <a href="notebooks/">Jupyter notebooks</a> ·
  <a href="data/">Datasets</a>
</p>

---

## Overview

Unsupervised Lab turns the lecture into something students can touch. Instead of reading about K-means, they drag the centroids themselves; instead of looking at a dendrogram, they cut it; instead of memorising "PCA maximises variance", they rotate a line through a cloud of points and watch the variance peak.

Everything runs in the browser: no installation, no sign-up, no server, no tracking. It also works offline once the repository is downloaded.

## What students learn

### 1 · Overview · [open](https://saeedserwan.github.io/unsupervised/)

| Section | Key ideas |
|---|---|
| Take the answers away | supervised vs unsupervised, the same data with and without labels |
| Where it fits | the course map: labelled? → group rows or reduce columns |
| Rows or columns? | clustering vs dimensionality reduction on one table |
| Same data, many answers | the "fuzzy goal": shapes grouped by colour, by shape, or classified |
| Why it is harder | no answer key; the curse of dimensionality, simulated live |
| Families of methods | centroid, hierarchical, model-based, density; hard vs soft |

### 2 · K-means · [open](https://saeedserwan.github.io/unsupervised/kmeans.html)

| Section | Key ideas |
|---|---|
| What makes a good clustering? | within-cluster variation W(C<sub>k</sub>); **be the algorithm** by dragging centroids |
| Why not try every split? | Kⁿ and Stirling numbers: brute force is hopeless |
| The algorithm | a step-by-step stepper (random labels, random points or K-means++ start), regions, trails, objective chart |
| Local minima | six random starts side by side; `n_init` |
| Choosing K | elbow and silhouette, with a per-point silhouette plot |
| Scale your features | income in BD vs age in years, raw vs standardised |
| Where K-means fails | six datasets: blobs, uneven, stretched, moons, circles, no structure |
| K-means++ | D² seeding, visualised |
| Checking against labels | iris: clusters vs true species, confusion matrix |

### 3 · Hierarchical clustering · [open](https://saeedserwan.github.io/unsupervised/hierarchical.html)

| Section | Key ideas |
|---|---|
| Reading a dendrogram | click two points: similarity is the fusion height, not leaf order |
| Cutting the tree | drag the cut line, any number of clusters from one tree |
| Building it bottom-up | merge-by-merge with the live distance matrix |
| Linkage | complete, single, average and centroid, drawn on draggable groups |
| Same data, different trees | four linkages on five datasets |
| How big can it get? | n(n−1)/2 distances and memory |

### 4 · PCA · [open](https://saeedserwan.github.io/unsupervised/pca.html)

| Section | Key ideas |
|---|---|
| The idea in one picture | rotating 3D cloud, the best-fitting plane, and the 2D scores |
| The first principal component | rotate a line: variance kept vs lost; loadings and the normalisation constraint |
| PC2 and beyond | shape the cloud; covariance matrix, eigenvalues and arrows update live |
| Standardise first | km vs metres vs z-scores |
| **How many components? 3D → 2D → 1D** | seven datasets (flat sheet, cigar, ball, body measurements, student marks, two groups, twisted ring); keep 1, 2 or 3 PCs; scree plot; 90% rule, elbow and Kaiser side by side |
| A recipe for choosing | six steps and a comparison of the rules |
| Real data: 13 → 2 | wine dataset scree plot and biplot |
| PCA as compression | rebuild an image from k components |
| Under the hood | eigenvectors, eigenvalues, SVD |

### 5 · Beyond the lecture · [open](https://saeedserwan.github.io/unsupervised/beyond.html)

DBSCAN with a k-distance plot, Gaussian mixture models fitted step by step with EM, a 6 × 5 grid comparing every method on every dataset, and a guide to choosing a method.

### 6 · Python walkthroughs

Two executed Jupyter notebooks, presented on the site with hover-to-explain code:

- **[Clustering in Python](https://saeedserwan.github.io/unsupervised/code-clustering.html)** · `notebooks/clustering_kmeans_hierarchical.ipynb` · customer segmentation with `StandardScaler`, `KMeans`, elbow, silhouette, SciPy `linkage` / `dendrogram` / `fcluster`.
- **[PCA in Python](https://saeedserwan.github.io/unsupervised/code-pca.html)** · `notebooks/pca_wine.ipynb` · why to standardise, scree plot, the 90% / Kaiser rules, 3D → 2D → 1D on simple data, loadings, biplot, reconstruction error, PCA + K-means.

Both can be opened in Google Colab from their pages.

Every page ends with a short quiz with instant explanations.

## Datasets

| File | Rows | Description |
|---|---|---|
| `data/customers.csv` | 200 | Synthetic shop customers: age, annual income (k BD), spending score |
| `data/iris.csv` | 150 | Fisher's iris flowers (as shipped with scikit-learn) |
| `data/wine.csv` | 178 | UCI wine recognition data: 13 chemical measurements, 3 cultivars (as shipped with scikit-learn) |

All other datasets on the site are generated in the browser from fixed random seeds, so every student sees the same pictures.

## Run it locally

Open `index.html` in any modern browser. That's it.

To rebuild the two Python walkthrough pages after editing `tools/walkthrough_content.py`:

```bash
pip install numpy pandas matplotlib scikit-learn scipy nbformat nbclient ipykernel markdown pillow
python tools/build_walkthroughs.py
```

This executes both notebooks, saves them with their outputs in `notebooks/`, and regenerates `code-clustering.html` and `code-pca.html`.

## Publish on GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / root. The site will appear at `https://<user>.github.io/unsupervised/`.

## Structure

```
index.html  kmeans.html  hierarchical.html  pca.html  beyond.html     interactive lessons
code-clustering.html  code-pca.html                                  generated walkthroughs
assets/css/style.css                                                 the minimal design
assets/js/lib.js                                                     algorithms, plotting and UI helpers
assets/js/{overview,kmeans,hier,pca,beyond,walkthrough}.js           one script per page
assets/js/data.js                                                    iris and wine for the browser
notebooks/  data/  tools/
```

The algorithms (K-means, K-means++, silhouette, agglomerative clustering with five linkages, PCA via Jacobi eigen-decomposition, DBSCAN, Gaussian mixtures with EM) are written from scratch in plain JavaScript in `assets/js/lib.js`, with no libraries, so students can read them. Maths is typeset with KaTeX (bundled).

## Author

**Eng. Saeed Serwan Abdulsattar**, College of Computer Studies, University of Technology Bahrain.

Released under the MIT License.
