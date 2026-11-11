"""
Content for the two code-walkthrough lessons (Clustering in Python, PCA in Python).

Each lesson is a list of cells:
  ("md",   "markdown text")
  ("code", "python code")

Inside a code cell, a line may end with   # >> explanation   to attach a
line-by-line explanation. A line ending with   # >>^   shares the explanation
of the line above (used for statements that span several lines).

tools/build_walkthroughs.py turns this into a Jupyter notebook (executed, with
outputs) and an HTML page for the website, so the two always match.

Author: Eng. Saeed Serwan Abdulsattar
"""

DATA = "https://raw.githubusercontent.com/SaeedSerwan/unsupervised/main/data"

STYLE = '''plt.rcParams["figure.figsize"] = (7, 4.5)  # >> Default figure size (width, height) in inches.
plt.rcParams["axes.spines.top"] = False  # >> A cleaner look: hide the top and right borders of every chart.
plt.rcParams["axes.spines.right"] = False  # >>^
plt.rcParams["axes.grid"] = True  # >> Light grid lines make values easier to read.
plt.rcParams["grid.color"] = "#ececec"  # >>^
COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"]  # >> The same six cluster colours as the website, in a fixed order.'''

CLUSTERING = {
    "slug": "clustering",
    "page": "code-clustering.html",
    "notebook": "clustering_kmeans_hierarchical.ipynb",
    "dataset": "customers.csv",
    "eyebrow": "Practice · Clustering in Python",
    "title": "Clustering in Python, <em>line by line.</em>",
    "doc_title": "K-means and Hierarchical Clustering in Python, Line by Line",
    "lead": "A complete, runnable notebook that segments 200 shop customers with K-means and hierarchical clustering. "
            "You will scale the data, choose K with the elbow and silhouette methods, read the clusters, and build a dendrogram. "
            "Hover over (or tap) any line of code to see what it does.",
    "learn": [
        "Load and explore a customer dataset with pandas",
        "Standardise features before clustering",
        "Choose K with the elbow and silhouette methods",
        "Fit K-means, read centroids and describe each segment",
        "Build, read and cut a dendrogram with SciPy",
    ],
    "cells": [
        ("md", """## 1. Import the libraries

We need **NumPy** for maths, **pandas** for tables, **Matplotlib** for charts, **scikit-learn** for scaling and K-means, and **SciPy** for the dendrogram."""),
        ("code", """%config InlineBackend.figure_format = "retina"  # >> A Jupyter setting (not Python): draw sharper plots on high-resolution screens.
import numpy as np  # >> NumPy: fast arrays and maths. `np` is the standard nickname.
import pandas as pd  # >> pandas: tables (DataFrames) with named columns.
import matplotlib.pyplot as plt  # >> Matplotlib's plotting interface, used for every chart.
from sklearn.preprocessing import StandardScaler  # >> Rescales each column to mean 0 and standard deviation 1.
from sklearn.cluster import KMeans  # >> The K-means algorithm.
from sklearn.metrics import silhouette_score, adjusted_rand_score  # >> Scores for judging a clustering and comparing two clusterings.
from scipy.cluster.hierarchy import linkage, dendrogram, fcluster  # >> Hierarchical clustering: build the tree, draw it, cut it.

""" + STYLE),

        ("md", """## 2. Load the dataset

The file records **200 customers** of a shopping mall: their age, annual income (thousands of BD) and a *spending score* from 1 to 99 that the mall gives each customer based on how much they buy.
There is **no answer column**: nobody has told us which "type" each customer is. That is what we want to discover."""),
        ("code", f"""url = "{DATA}/customers.csv"  # >> The file's web address. You can also download the CSV and use its local file name.
df = pd.read_csv(url)  # >> Read the CSV into a DataFrame. Each row is one customer.
print("Rows and columns:", df.shape)  # >> `.shape` gives (rows, columns): 200 customers, 4 columns.
df.head()  # >> Show the first 5 rows."""),

        ("md", """## 3. Explore the data

Always look before you cluster. Summary statistics tell us the scale of each column; a scatter plot shows whether groups are visible."""),
        ("code", """df.describe().round(1)  # >> Count, mean, standard deviation, min, quartiles and max for every column."""),
        ("code", """fig, ax = plt.subplots()  # >> One figure with one set of axes.
ax.scatter(df["annual_income_k"], df["spending_score"], s=22, color="#555")  # >> One grey dot per customer: income across, spending score up.
ax.set(xlabel="annual income (k BD)", ylabel="spending score (1-99)",  # >> Label the axes and give the chart a title.
       title="200 customers, no labels")  # >>^
plt.show()  # >> Display the figure."""),
        ("md", """Our eyes can probably see about **five** groups. Let us see whether K-means agrees, without telling it anything except the numbers.

> We cluster on **income** and **spending score** only, so every result can be drawn in 2D. With more columns the code is identical; only the plots change."""),

        ("md", """## 4. Standardise the features

K-means uses Euclidean distance, so a column with bigger numbers would get a bigger vote. `StandardScaler` subtracts each column's mean and divides by its standard deviation, so both columns count equally."""),
        ("code", """X = df[["annual_income_k", "spending_score"]].to_numpy()  # >> Take the two columns we will cluster on, as a NumPy array (200 rows × 2 columns).
scaler = StandardScaler()  # >> Create the scaler.
X_scaled = scaler.fit_transform(X)  # >> `fit` learns each column's mean and standard deviation; `transform` applies z = (x − mean) / sd.
print("Means after scaling:", X_scaled.mean(axis=0).round(3))  # >> Both columns now have mean 0 …
print("Std after scaling:  ", X_scaled.std(axis=0).round(3))  # >> … and standard deviation 1."""),

        ("md", """## 5. Choose K: the elbow method

Fit K-means for K = 1 … 10 and record the **inertia**: the total squared distance of points to their own centroid (the lecture's objective, without the factor 2). It always falls as K grows, so we look for the **elbow** where it stops falling fast."""),
        ("code", """ks = range(1, 11)  # >> The values of K we will try: 1, 2, …, 10.
inertias = []  # >> An empty list to collect one inertia per K.
for k in ks:  # >> Loop over every K …
    km = KMeans(n_clusters=k, n_init=10, random_state=0)  # >> … create K-means with K clusters. `n_init=10` runs 10 random starts and keeps the best (lowest inertia); `random_state` makes it repeatable.
    km.fit(X_scaled)  # >> Run the assign / update loop until it converges.
    inertias.append(km.inertia_)  # >> Save the final objective for this K.

fig, ax = plt.subplots()  # >> A new chart.
ax.plot(ks, inertias, "o-", color="#111")  # >> Inertia against K, with a dot at each K.
ax.set(xlabel="K (number of clusters)", ylabel="inertia (within-cluster SS)", title="Elbow method")  # >> Labels and title.
plt.show()  # >> Display."""),
        ("md", """The curve drops steeply until **K = 5**, then flattens: adding more clusters stops paying off. That is the elbow."""),

        ("md", """## 6. Choose K: the silhouette score

For each point the silhouette compares its average distance to its own cluster ($a$) with its average distance to the nearest other cluster ($b$): $s = (b - a) / \\max(a, b)$. Values near 1 mean well-separated clusters. We pick the K with the highest average."""),
        ("code", """sil = {}  # >> A dictionary: K → average silhouette.
for k in range(2, 11):  # >> The silhouette needs at least 2 clusters.
    labels = KMeans(n_clusters=k, n_init=10, random_state=0).fit_predict(X_scaled)  # >> Fit and return the cluster label of every customer, in one call.
    sil[k] = silhouette_score(X_scaled, labels)  # >> Average silhouette over all 200 customers.

best_k = max(sil, key=sil.get)  # >> The K with the largest silhouette.
fig, ax = plt.subplots()  # >> A new chart.
ax.bar(list(sil), list(sil.values()), color=["#2a78d6" if k == best_k else "#cfcfca" for k in sil])  # >> One bar per K; the best one in blue.
ax.set(xlabel="K", ylabel="average silhouette", title=f"Best silhouette: K = {best_k}")  # >> Labels, with the winner in the title.
plt.show()  # >> Display."""),
        ("md", """Both methods point to **K = 5**. When two different tools agree, we can be more confident."""),

        ("md", """## 7. Fit K-means with K = 5"""),
        ("code", """kmeans = KMeans(n_clusters=5, n_init=10, random_state=0)  # >> The final model: 5 clusters, best of 10 random starts.
df["cluster"] = kmeans.fit_predict(X_scaled)  # >> Fit, and store each customer's cluster (0-4) as a new column.
centres = scaler.inverse_transform(kmeans.cluster_centers_)  # >> The centroids live in the scaled space; `inverse_transform` converts them back to BD and score units.
print("Inertia:", round(kmeans.inertia_, 2))  # >> The objective of the best run.
print("Customers per cluster:", np.bincount(df["cluster"]))  # >> `bincount` counts how many customers got each label."""),
        ("code", """fig, ax = plt.subplots()  # >> A new chart.
for c in range(5):  # >> Draw one cluster at a time so each gets its own colour and legend entry.
    pts = df[df["cluster"] == c]  # >> The rows (customers) in cluster c.
    ax.scatter(pts["annual_income_k"], pts["spending_score"], s=24, color=COLORS[c], label=f"cluster {c}")  # >> Their income and spending score, in cluster c's colour.
ax.scatter(centres[:, 0], centres[:, 1], marker="X", s=220, color="#111", edgecolor="white", label="centroid")  # >> The five centroids as large black crosses.
ax.set(xlabel="annual income (k BD)", ylabel="spending score (1-99)", title="K-means, K = 5")  # >> Labels and title.
ax.legend(fontsize=8, ncol=2)  # >> A small legend in two columns.
plt.show()  # >> Display."""),

        ("md", """## 8. Describe each segment

Clusters only become useful when a human interprets them. The average of each column per cluster tells us who is in it."""),
        ("code", """summary = df.groupby("cluster")[["age", "annual_income_k", "spending_score"]].mean().round(1)  # >> Average age, income and score per cluster.
summary["customers"] = df["cluster"].value_counts().sort_index()  # >> Add the size of each cluster.
summary  # >> Show the table."""),
        ("md", """Reading the table, we might name them: *careful earners* (high income, low spending), *big spenders* (high income, high spending), *average customers*, *careful budgets* (low income, low spending) and *young enthusiasts* (low income, high spending). The names are **our** interpretation, not the algorithm's: K-means only says 0, 1, 2, 3, 4."""),

        ("md", """## 9. Local minima: why `n_init` matters

With a single random start, K-means can get stuck. Run it five times with `n_init=1` and compare the objective."""),
        ("code", """for seed in range(5):  # >> Five different random starts …
    km = KMeans(n_clusters=5, n_init=1, init="random", random_state=seed).fit(X_scaled)  # >> … one start each, with purely random initial centroids.
    print(f"start {seed}: inertia = {km.inertia_:.2f}")  # >> Print the objective each run reached."""),
        ("md", """Different starts can stop at different local minima with a worse (higher) inertia. That is why scikit-learn runs several starts and keeps the best."""),

        ("md", """## 10. Hierarchical clustering: the dendrogram

SciPy's `linkage` performs agglomerative clustering and records every merge. `dendrogram` draws the tree."""),
        ("code", """Z = linkage(X_scaled, method="ward")  # >> Build the tree bottom-up with Ward linkage (merge the pair that increases within-cluster variation least). Try "complete", "average" or "single" too.
fig, ax = plt.subplots(figsize=(10, 4.5))  # >> A wide figure: 200 leaves need space.
dendrogram(Z, ax=ax, no_labels=True, color_threshold=6,  # >> Draw the tree. Branches below height 6 are coloured by cluster; leaf labels are hidden (200 would be unreadable).
           above_threshold_color="#999")  # >>^
ax.axhline(6, color="#111", linestyle="--", linewidth=1)  # >> The cut line at height 6.
ax.set(ylabel="merge height (distance)", title="Dendrogram (Ward linkage) with a cut at height 6")  # >> Labels and title.
ax.grid(False)  # >> Grid lines would clutter the tree.
plt.show()  # >> Display."""),
        ("md", """Reading the tree: the long vertical gap just below the dashed line means the five groups underneath are well separated. Cutting there gives **five clusters**. Remember the rule: similarity is the **height** where branches join, not how close leaves are along the bottom."""),
        ("code", """df["hc"] = fcluster(Z, t=5, criterion="maxclust")  # >> Cut the tree so that exactly 5 clusters remain; labels are 1-5.
print(pd.crosstab(df["cluster"], df["hc"]))  # >> Rows: K-means cluster, columns: hierarchical cluster. Large numbers on one cell per row mean they agree.
print("Adjusted Rand index:", round(adjusted_rand_score(df["cluster"], df["hc"]), 3))  # >> 1 = identical groupings (ignoring label names), 0 = no better than chance."""),

        ("md", """## 11. Linkage changes the tree

The same data with three other linkages. Notice single linkage's staircase of one-point merges."""),
        ("code", """fig, axes = plt.subplots(1, 3, figsize=(12, 3.6))  # >> Three panels side by side.
for ax, method in zip(axes, ["complete", "average", "single"]):  # >> One linkage per panel.
    dendrogram(linkage(X_scaled, method=method), ax=ax, no_labels=True, color_threshold=0, above_threshold_color="#444")  # >> Build and draw the tree in plain grey.
    ax.set_title(f"{method} linkage")  # >> Name the panel.
    ax.grid(False)  # >> No grid.
plt.tight_layout()  # >> Stop the titles overlapping.
plt.show()  # >> Display."""),

        ("md", """## 12. Summary

| Step | Code |
|---|---|
| Scale | `StandardScaler().fit_transform(X)` |
| K-means | `KMeans(n_clusters=K, n_init=10).fit_predict(X_scaled)` |
| Choose K | elbow on `inertia_`; `silhouette_score` |
| Centroids in real units | `scaler.inverse_transform(kmeans.cluster_centers_)` |
| Tree | `linkage(X_scaled, method="ward")`, `dendrogram(Z)` |
| Cut the tree | `fcluster(Z, t=K, criterion="maxclust")` |

## 13. Exercises

1. Add `age` as a third clustering feature. Does the best K change?
2. Run the K-means cell **without** `StandardScaler`. Which feature dominates, and why?
3. Replace `"ward"` with `"single"` in the dendrogram and cut it into 5 clusters. Compare with K-means using the adjusted Rand index.
4. Give each of the five segments a marketing action. Which segment would you target first?"""),
    ],
}

PCA_LESSON = {
    "slug": "pca",
    "page": "code-pca.html",
    "notebook": "pca_wine.ipynb",
    "dataset": "wine.csv",
    "eyebrow": "Practice · PCA in Python",
    "title": "PCA in Python, <em>line by line.</em>",
    "doc_title": "Principal Component Analysis in Python, Line by Line",
    "lead": "A complete, runnable notebook that reduces 13 chemical measurements of 178 wines to a handful of principal components. "
            "You will standardise, fit PCA, read the scree plot, choose the number of components with three rules, interpret the loadings and draw a biplot. "
            "Hover over (or tap) any line of code to see what it does.",
    "learn": [
        "See why PCA needs standardised data",
        "Read explained variance and draw a scree plot",
        "Choose the number of components (90% rule, Kaiser, elbow)",
        "Interpret loadings and draw a biplot",
        "Use PCA before clustering",
    ],
    "cells": [
        ("md", """## 1. Import the libraries"""),
        ("code", """%config InlineBackend.figure_format = "retina"  # >> A Jupyter setting (not Python): sharper plots on high-resolution screens.
import numpy as np  # >> NumPy: arrays and maths.
import pandas as pd  # >> pandas: tables.
import matplotlib.pyplot as plt  # >> Matplotlib: charts.
from sklearn.preprocessing import StandardScaler  # >> Rescales each column to mean 0, standard deviation 1.
from sklearn.decomposition import PCA  # >> Principal component analysis.
from sklearn.cluster import KMeans  # >> K-means, used at the end to cluster in PC space.
from sklearn.metrics import adjusted_rand_score  # >> Compares two groupings (1 = identical).

""" + STYLE),

        ("md", """## 2. Load the dataset

The wine dataset has **178 wines** from **three cultivars** (grape growers) and **13 chemical measurements**. The `cultivar` column is the answer key: we will **not** give it to PCA, only use it afterwards to colour the plots."""),
        ("code", f"""url = "{DATA}/wine.csv"  # >> The file's web address.
df = pd.read_csv(url)  # >> Read it into a DataFrame.
X = df.drop(columns="cultivar")  # >> The 13 measurement columns: the only thing PCA will see.
y = df["cultivar"]  # >> The cultivar (1, 2 or 3), kept aside for colouring plots.
print("X:", X.shape, "  cultivars:", sorted(y.unique().tolist()))  # >> 178 rows × 13 columns, and the three cultivar codes.
X.head()  # >> The first five wines."""),

        ("md", """## 3. Why we must standardise

PCA chases variance. Look at how differently the columns are scaled."""),
        ("code", """X.var().sort_values(ascending=False).round(2).head(6)  # >> Variance of each column, largest first. Proline's variance is in the tens of thousands; most others are below 10."""),
        ("code", """pca_raw = PCA().fit(X)  # >> PCA on the raw, unscaled columns (a mistake, on purpose).
print("PC1 share of variance (raw):", round(pca_raw.explained_variance_ratio_[0], 4))  # >> PC1 "explains" almost everything …
print("Largest PC1 loading:", X.columns[np.argmax(np.abs(pca_raw.components_[0]))])  # >> … because PC1 is basically just proline, the column with the biggest numbers."""),
        ("md", """That is not a discovery, it is an artefact of the units. So we standardise first."""),
        ("code", """X_scaled = StandardScaler().fit_transform(X)  # >> Every column now has mean 0 and standard deviation 1, so each gets an equal say.
pca = PCA()  # >> Keep all 13 components for now, so we can decide how many we need.
scores = pca.fit_transform(X_scaled)  # >> Fit PCA (find the directions) and return every wine's scores on all 13 components.
print("scores shape:", scores.shape)  # >> 178 wines × 13 component scores."""),

        ("md", """## 4. How much variance does each component explain?

`explained_variance_ratio_` is the PVE of each component. Its running total is the cumulative PVE."""),
        ("code", """pve = pca.explained_variance_ratio_  # >> Proportion of variance explained by each component (they sum to 1).
cum = np.cumsum(pve)  # >> Running total: how much the first k components explain together.
table = pd.DataFrame({"PVE": pve, "cumulative": cum, "eigenvalue": pca.explained_variance_},  # >> Put the three columns in one table …
                     index=[f"PC{i}" for i in range(1, 14)]).round(3)  # >>^
table.head(8)  # >> … and show the first eight components."""),
        ("code", """fig, ax = plt.subplots()  # >> A new chart.
comps = np.arange(1, 14)  # >> Component numbers 1-13 for the x-axis.
ax.bar(comps, pve, color="#2a78d6", label="PVE of each component")  # >> Bars: how much each component adds.
ax.plot(comps, cum, "o-", color="#111", label="cumulative PVE")  # >> Line: the running total.
for t in (0.8, 0.9):  # >> Draw the common thresholds …
    ax.axhline(t, color="#999", linestyle="--", linewidth=1)  # >> … as dashed horizontal lines at 80% and 90%.
ax.set(xlabel="principal component", ylabel="proportion of variance", xticks=comps, title="Scree plot")  # >> Labels, one tick per component, title.
ax.legend()  # >> Show which mark is which.
plt.show()  # >> Display."""),

        ("md", """## 5. Choose the number of components

Three common rules. When they disagree, your **purpose** decides: 2 for a plot, more for feeding a model."""),
        ("code", """k_90 = int(np.argmax(cum >= 0.90)) + 1  # >> 90% rule: the first position where the cumulative PVE reaches 0.90 (+1 because positions start at 0).
k_80 = int(np.argmax(cum >= 0.80)) + 1  # >> The same with an 80% threshold.
k_kaiser = int(np.sum(pca.explained_variance_ > 1))  # >> Kaiser rule: keep components whose eigenvalue (variance) is above 1, i.e. worth more than one standardised column.
print(f"80% rule: k = {k_80}")  # >> Print each rule's answer.
print(f"90% rule: k = {k_90}")  # >>^
print(f"Kaiser:   k = {k_kaiser}")  # >>^
print(f"First 2 components keep {cum[1]:.1%} of the variance")  # >> And what we keep if we only want a 2D picture."""),
        ("code", """pca90 = PCA(n_components=0.90).fit(X_scaled)  # >> A shortcut: a number between 0 and 1 asks scikit-learn to keep just enough components for that share of variance.
print("components kept:", pca90.n_components_)  # >> Same answer as the 90% rule above."""),

        ("md", """## 6. 3D → 2D → 1D on simple data

Before interpreting the wine components, see how the PVE reveals a dataset's true dimension. We make three 3D datasets with NumPy: a flat sheet, a cigar and a round ball."""),
        ("code", """rng = np.random.default_rng(0)  # >> A random number generator with a fixed seed, so the results repeat.
n = 300  # >> 300 points per dataset.
a, b, c = rng.normal(size=(3, n))  # >> Three columns of standard normal noise.
shapes = {  # >> Each dataset is an n × 3 array:
    "flat sheet": np.c_[a + b, a - b, 0.05 * c],  # >> spread in two directions, almost none in the third
    "cigar": np.c_[a, a + 0.1 * b, a + 0.1 * c],  # >> all three columns nearly the same: one direction
    "round ball": np.c_[a, b, c],  # >> independent columns: no special direction
}  # >>^
for name, data in shapes.items():  # >> For each dataset …
    p = PCA().fit(data).explained_variance_ratio_  # >> … fit PCA and get the PVE of the three components …
    print(f"{name:11s} PVE = {np.round(p, 3)}  cumulative = {np.round(np.cumsum(p), 3)}")  # >> … and print them with the running total."""),
        ("md", """- **Flat sheet**: two components keep ~100% → it is really **2D**: keep 2.
- **Cigar**: one component keeps ~99% → it is really **1D**: keep 1.
- **Round ball**: about a third each → nothing to drop: PCA cannot reduce it.

The interactive version, with seven datasets, is on the [PCA page](https://saeedserwan.github.io/unsupervised/pca.html#how-many)."""),

        ("md", """## 7. Plot the wines in 2D

The first two score columns are each wine's position on PC1 and PC2. We colour by cultivar only to *check* the result; PCA never saw it."""),
        ("code", """fig, ax = plt.subplots(figsize=(6.5, 5))  # >> A slightly squarer figure.
for i, cult in enumerate([1, 2, 3]):  # >> One cultivar at a time, so each gets its own colour and legend entry.
    m = (y == cult).to_numpy()  # >> True for the wines of this cultivar.
    ax.scatter(scores[m, 0], scores[m, 1], s=22, color=COLORS[i], label=f"cultivar {cult}")  # >> Their PC1 and PC2 scores.
ax.set(xlabel=f"PC1 ({pve[0]:.0%})", ylabel=f"PC2 ({pve[1]:.0%})", title="Wines on the first two principal components")  # >> Axis labels show how much variance each PC holds.
ax.legend()  # >> Legend.
plt.show()  # >> Display."""),
        ("md", """Thirteen columns squeezed into two, and the three cultivars still separate almost perfectly."""),

        ("md", """## 8. What are the components made of? Loadings

`components_` holds the loadings: one row per component, one column per original feature. Each row has length 1."""),
        ("code", """loadings = pd.DataFrame(pca.components_[:2].T, index=X.columns, columns=["PC1", "PC2"])  # >> The first two rows, transposed so features are rows.
loadings.sort_values("PC1").round(2)  # >> Sorted by their PC1 loading, from most negative to most positive."""),
        ("code", """fig, ax = plt.subplots(figsize=(6.5, 5))  # >> A biplot: scores and loadings on one chart.
ax.scatter(scores[:, 0], scores[:, 1], s=14, c=[COLORS[c - 1] for c in y], alpha=0.5)  # >> The wines, faded.
scale = 4  # >> Loadings are at most 1 long; stretch the arrows so they are visible next to the scores.
for name, (l1, l2) in loadings.iterrows():  # >> For each feature …
    ax.arrow(0, 0, l1 * scale, l2 * scale, color="#111", width=0.01, head_width=0.08)  # >> … draw an arrow from the origin in its loading direction …
    ax.text(l1 * scale * 1.12, l2 * scale * 1.12, name, fontsize=7, ha="center")  # >> … and label it near the tip.
ax.set(xlabel="PC1", ylabel="PC2", title="Biplot")  # >> Labels.
plt.show()  # >> Display."""),
        ("md", """Features pointing the same way are positively correlated; arrows pointing towards a group of wines show what is high for those wines. Flavanoids and total phenols pull towards cultivar 1, colour intensity and malic acid towards cultivar 3."""),

        ("md", """## 9. What do we lose? Reconstruction error

Keep k components, map back to the original space with `inverse_transform`, and measure the error."""),
        ("code", """errors = []  # >> One error per k.
for k in range(1, 14):  # >> k = 1 … 13 components.
    p = PCA(n_components=k).fit(X_scaled)  # >> Keep only k components.
    X_back = p.inverse_transform(p.transform(X_scaled))  # >> Compress to k numbers per wine, then rebuild all 13 columns from them.
    errors.append(np.mean((X_scaled - X_back) ** 2))  # >> Mean squared reconstruction error.

fig, ax = plt.subplots()  # >> A new chart.
ax.plot(range(1, 14), errors, "o-", color="#eb6834")  # >> Error against k.
ax.set(xlabel="components kept (k)", ylabel="mean squared error", xticks=range(1, 14), title="Information lost vs components kept")  # >> Labels.
plt.show()  # >> Display."""),
        ("md", """The error equals the share of variance we dropped: it is $1 - $ cumulative PVE. Keeping all 13 components rebuilds the data perfectly (error 0)."""),

        ("md", """## 10. PCA before clustering

A common pipeline: standardise → PCA → K-means. Clustering on a few component scores removes noise and makes results easy to plot."""),
        ("code", """Z2 = scores[:, :2]  # >> Each wine's first two component scores.
labels = KMeans(n_clusters=3, n_init=10, random_state=0).fit_predict(Z2)  # >> Three clusters in the 2D PC space.
print(pd.crosstab(y, labels, rownames=["cultivar"], colnames=["cluster"]))  # >> Compare clusters with the true cultivars (which K-means never saw).
print("Adjusted Rand index:", round(adjusted_rand_score(y, labels), 3))  # >> Close to 1 means the clusters match the cultivars well."""),

        ("md", """## 11. Summary

| Step | Code |
|---|---|
| Standardise | `X_scaled = StandardScaler().fit_transform(X)` |
| Fit all components | `pca = PCA().fit(X_scaled)` |
| Variance explained | `pca.explained_variance_ratio_`, `np.cumsum(...)` |
| Choose k | 90% rule, Kaiser (`explained_variance_ > 1`), elbow, or `PCA(n_components=0.90)` |
| Scores | `pca.transform(X_scaled)` |
| Loadings | `pca.components_` |
| Rebuild | `pca.inverse_transform(scores)` |

## 12. Exercises

1. Repeat section 7 **without** standardising. What happens to the picture, and why?
2. How many components does an 80% threshold keep? A 95% threshold?
3. Which three features have the largest absolute loadings on PC2? Give PC2 a name.
4. Cluster on 5 components instead of 2. Does the adjusted Rand index improve?"""),
    ],
}

LESSONS = [CLUSTERING, PCA_LESSON]
