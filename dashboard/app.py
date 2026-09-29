"""
WorkForce AI dashboard (Phase 5).

Run it (from the project root, with the virtualenv active):

    streamlit run dashboard/app.py

It reads ONLY the aggregated files in results/ (written by
`python -m analysis.run_all`), never the API or raw job data, so it's safe
to publish (DECISIONS.md, D15/D21).
"""

import json
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

RESULTS = Path(__file__).resolve().parent.parent / "results"

# ---- Palette: the dataviz reference palette (colour-blind-validated order) ----
BLUE, ORANGE, AQUA, YELLOW, MAGENTA, GREEN = "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"
CATEGORICAL = [BLUE, ORANGE, AQUA, YELLOW, MAGENTA, GREEN]
RED, GRAY, LIGHT_GRAY = "#e34948", "#898781", "#c3c2b7"
SEQUENTIAL = ["#f4f8fd", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"]
INK, INK_2, GRID = "#0b0b0b", "#52514e", "#e1e0d9"
JOB_TYPE_COLORS = {"BI / dashboard analyst": BLUE, "Business-facing analyst": ORANGE, "Python + SQL analyst": AQUA,
                   "Excel / reporting analyst": YELLOW, "Cloud data analyst": MAGENTA, "Few skills listed": GREEN}

st.set_page_config(page_title="WorkForce AI: Data Analyst Jobs in India", page_icon="📊", layout="wide")


# ---- Loading ------------------------------------------------------------------

@st.cache_data
def csv(name: str) -> pd.DataFrame:
    return pd.read_csv(RESULTS / name)


@st.cache_data
def js(name: str) -> dict:
    return json.loads((RESULTS / name).read_text())


meta, ov = js("meta.json"), js("overview.json")


def lakh(x) -> str:
    return "–" if pd.isna(x) else f"₹{x / 1e5:.1f}L"


def pct(x) -> str:
    return f"{100 * x:.0f}%"


def style(fig, height=380, legend=True):
    """One consistent, quiet look for every chart: hairline grid, no chart junk."""
    fig.update_layout(
        height=height, margin=dict(l=10, r=10, t=30, b=10), plot_bgcolor="#fcfcfb", paper_bgcolor="#fcfcfb",
        font=dict(family="system-ui, -apple-system, Segoe UI, sans-serif", color=INK, size=13),
        showlegend=legend, legend=dict(orientation="h", y=-0.15, title_text=""),
        hoverlabel=dict(bgcolor="white", font_color=INK),
    )
    fig.update_coloraxes(colorbar=dict(tickformat=".0%", thickness=12, title_text=""))
    fig.update_xaxes(gridcolor=GRID, linecolor=LIGHT_GRAY, zeroline=False, title_font_color=INK_2)
    fig.update_yaxes(gridcolor=GRID, linecolor=LIGHT_GRAY, zeroline=False, title_font_color=INK_2)
    return fig


def show(fig, table: pd.DataFrame | None = None, note: str | None = None):
    st.plotly_chart(fig, width="stretch", config={"displayModeBar": False})
    if note:
        st.caption(note)
    if table is not None:
        with st.expander("Show the numbers"):
            st.dataframe(table, hide_index=True, width="stretch")


def hbar(df, x, y, fmt=".0%", color=BLUE, height=None, xtitle="", money=False):
    """
    A horizontal bar chart, biggest at the top, one colour (single series).
    money=True shows rupees as lakh (₹7.5L). Labels sit outside the bar end,
    with extra room on the right so they are never clipped.
    """
    d = df.sort_values(x)
    vals = d[x] / 1e5 if money else d[x]
    text = [f"₹{v:.1f}L" for v in vals] if money else None
    fig = go.Figure(go.Bar(x=vals, y=d[y], orientation="h", marker_color=color, marker_line_width=0,
                           text=text, texttemplate=None if money else f"%{{x:{fmt}}}", textposition="outside",
                           cliponaxis=False,
                           hovertemplate=("%{y}: ₹%{x:.1f}L" if money else f"%{{y}}: %{{x:{fmt}}}") + "<extra></extra>"))
    fig = style(fig, height or max(260, 28 * len(d) + 60), legend=False)
    fig.update_xaxes(tickformat=".0f" if money else fmt, title_text=xtitle, range=[0, vals.max() * 1.18])
    return fig


def donut(labels, values, height=340, colors: dict | None = None):
    """
    Part-to-whole, 6 slices at most. % inside each slice, and a legend that
    names every slice with its share, so colour is never the only cue and
    long names are never clipped at the chart edge.
    """
    labels, values = list(labels), list(values)
    total = sum(values) or 1
    named = [f"{l}  ({v / total:.0%})" for l, v in zip(labels, values)]
    palette = [colors[l] for l in labels] if colors else CATEGORICAL[:len(labels)]
    fig = go.Figure(go.Pie(labels=named, values=values, hole=0.55, sort=False,
                           marker=dict(colors=palette, line=dict(color="#fcfcfb", width=2)),
                           texttemplate="%{percent:.0%}", textposition="inside", insidetextfont=dict(color="white"),
                           hovertemplate="%{label}: %{value:,} postings<extra></extra>"))
    fig = style(fig, height)
    fig.update_layout(legend=dict(orientation="v", x=1.02, y=0.5, yanchor="middle"), margin=dict(l=10, r=10, t=20, b=20),
                      uniformtext=dict(minsize=11, mode="hide"))  # hide in-slice % that doesn't fit; the legend has it
    return fig


# ---- Sidebar ------------------------------------------------------------------

PAGES = ["🏠 Overview", "🧠 Skills", "💰 Salary", "🧩 6 job types", "📍 Cities", "🏢 Companies & industries",
         "🎓 Fresher reality", "🤖 AI, work mode & education", "📈 Market trends", "🔎 Job market explorer",
         "ℹ️ About & method"]
with st.sidebar:
    st.markdown("### 📊 WorkForce AI")
    st.caption("Data Analyst job market, India")
    page = st.radio("Go to", PAGES, label_visibility="collapsed")
    st.divider()
    w = meta["data_window"]
    st.caption(f"Data: {w['first_run'][:10]} → {w['last_run'][:10]} · {w['runs']} collection runs")
    st.caption("Jobs & salary data: [The Adzuna API](https://www.adzuna.in)")
    st.caption("Built by Dipayan & Sayak")

st.title(page.split(" ", 1)[1])


# ---- Pages --------------------------------------------------------------------

if page == PAGES[0]:  # Overview
    st.markdown("**What do Data Analyst jobs in India actually ask for, and which skills go with higher pay?** "
                "Every number here comes from job postings we collected ourselves.")
    tiles = [
        ("Analyst jobs analysed", f"{ov['analyst_postings']:,}", "all 10 analyst job titles"),
        ("Data Analyst jobs", f"{ov['da_postings']:,}", "with their skills checked"),
        ("Hiring companies", f"{ov['companies']:,}", "named employers"),
        ("Median Data Analyst salary", lakh(ov["da_median_salary"]), f"from {ov['da_salaried']} ads that list a salary"),
        ("Most asked-for skill", ov["top_skill"], f"in {pct(ov['top_skill_share'])} of Data Analyst jobs"),
        ("Top hiring city", ov["top_city"], f"{pct(ov['top_city_share_of_known'])} of jobs that name a metro"),
    ]
    for row in (tiles[:3], tiles[3:]):
        for col, (label, value, note) in zip(st.columns(3), row):
            col.metric(label, value)
            col.caption(note)

    st.subheader("What we found")
    q = csv("skill_quadrant.csv").set_index("skill")
    jp = csv("job_type_pay.csv").set_index("job_type")
    lv = csv("skill_demand_by_level.csv").pivot(index="skill", columns="experience_level", values="share")
    ct = csv("company_types.csv").set_index("company_type")
    f = st.columns(2)
    with f[0]:
        st.info(f"**🧰 More tools ≠ more pay.** Business-facing Data Analyst jobs list ~3 skills yet pay "
                f"**{jp.loc['Business-facing analyst', 'pct_vs_bi_dashboard']:+.0f}%** vs BI/dashboard jobs that list ~6–7 tools "
                f"(same experience level and city).")
        st.info(f"**📈 Excel gets you in, stakeholder skills move you up.** Excel: {pct(lv.loc['Excel', 'junior'])} of junior "
                f"jobs → {pct(lv.loc['Excel', 'senior'])} of senior. Stakeholder management: {pct(lv.loc['Stakeholder mgmt', 'junior'])} → "
                f"{pct(lv.loc['Stakeholder mgmt', 'senior'])}.")
    with f[1]:
        leans = ", ".join(q.index[q["pay_signal"] == "leans higher pay"])
        st.info(f"**💎 Skills that lean toward higher pay:** {leans}. **Lean lower:** "
                f"{', '.join(q.index[q['pay_signal'] == 'leans lower pay'])}. (Consistent direction; see Salary for certainty.)")
        st.info(f"**☁️ Which cloud depends on the industry.** Azure: {pct(ct.loc['IT & analytics services', 'share_Azure'])} of "
                f"IT-services jobs vs {pct(ct.loc['Bank & financial services', 'share_Azure'])} at banks. AWS: "
                f"{pct(ct.loc['Pharma & healthcare', 'share_AWS'])} at pharma & healthcare.")
    st.caption("Salary findings are associations in advertised pay, not proof of cause, and mostly reflect smaller employers: "
               "big companies rarely publish salaries. See About & method.")

elif page == PAGES[1]:  # Skills
    q = csv("skill_quadrant.csv")
    st.subheader("The skill map: how common vs does it pay?")
    st.caption("Each dot is a skill. Right = asked for more often. Up = higher advertised pay at the same experience level "
               "and city. Colour = how consistent the pay signal is across 4 versions of the model.")
    colors = {"leans higher pay": BLUE, "leans lower pay": RED, "unclear": GRAY}
    d = q.dropna(subset=["pct_effect"])
    fig = go.Figure()
    for signal, g in d.groupby("pay_signal"):
        fig.add_trace(go.Scatter(
            x=g["demand_share"], y=g["pct_effect"] / 100, mode="markers+text", name=signal, text=g["skill"],
            textposition="top center", marker=dict(size=13, color=colors[signal], line=dict(color="#fcfcfb", width=2)),
            customdata=g[["pct_low", "pct_high", "postings_with_skill"]],
            hovertemplate="<b>%{text}</b><br>in %{x:.0%} of jobs<br>pay: %{y:+.0%} "
                          "(95% range %{customdata[0]:+.0f}% to %{customdata[1]:+.0f}%)<br>"
                          "%{customdata[2]} salaried jobs have it<extra></extra>"))
    fig.add_hline(y=0, line_color=LIGHT_GRAY)
    fig.add_vline(x=0.25, line_color=LIGHT_GRAY)
    for x, y, text, xa, ya in [(0.01, 0.99, "NICHE + PAYS MORE", "left", "top"), (0.99, 0.99, "COMMON + PAYS MORE", "right", "top"),
                               (0.01, 0.01, "NICHE, NO PAY EDGE", "left", "bottom"), (0.99, 0.01, "COMMON, NO PAY EDGE", "right", "bottom")]:
        fig.add_annotation(xref="paper", yref="paper", x=x, y=y, text=text, showarrow=False, xanchor=xa, yanchor=ya,
                           font=dict(size=11, color=GRAY))
    fig = style(fig, 460)
    fig.update_xaxes(tickformat=".0%", title_text="Share of Data Analyst jobs asking for the skill")
    fig.update_yaxes(tickformat="+.0%", title_text="Pay difference (same level & city)")
    show(fig, q[["skill", "demand_share", "pct_effect", "pct_low", "pct_high", "pay_signal", "certain", "quadrant"]],
         "Not enough salaried jobs to measure pay for: " + ", ".join(q.loc[q["pct_effect"].isna(), "skill"]) + ".")

    c = st.columns(2)
    with c[0]:
        st.subheader("Requirements scorecard")
        show(hbar(csv("skill_demand.csv"), "share", "skill", xtitle="Share of Data Analyst jobs"), csv("skill_demand.csv"))
    with c[1]:
        st.subheader("Most common skill combinations")
        combos = csv("skill_combinations.csv")
        k = st.segmented_control("Combination size", ["Pairs", "Triples"], default="Pairs")
        sub = combos[combos["skills"] == (2 if k != "Triples" else 3)].head(10)
        show(hbar(sub, "share", "combination", xtitle="Share of jobs with ALL these skills"), sub)

    st.subheader("How often skills appear together")
    m = csv("skill_cooccurrence.csv").set_index("skill")
    fig = px.imshow(m, color_continuous_scale=SEQUENTIAL, text_auto=".0%", aspect="auto", labels=dict(x="", y="", color=""))
    fig.update_traces(hovertemplate="%{y} + %{x}: %{z:.0%} of jobs<extra></extra>")
    show(style(fig, 560, legend=False), note="Diagonal = how common each skill is on its own.")

    st.subheader("Junior vs senior: which skills rise with seniority?")
    lv = csv("skill_demand_by_level.csv")
    lv = lv[lv["experience_level"].isin(["junior", "mid", "senior"])]
    fig = px.bar(lv, x="skill", y="share", color="experience_level", barmode="group",
                 category_orders={"experience_level": ["junior", "mid", "senior"]},
                 color_discrete_sequence=[BLUE, ORANGE, AQUA])
    fig.update_traces(hovertemplate="%{x}: %{y:.0%}<extra></extra>", marker_line_width=0)
    fig = style(fig, 400)
    fig.update_yaxes(tickformat=".0%", title_text="Share of jobs")
    fig.update_xaxes(title_text="")
    n = lv.groupby("experience_level")["postings"].first()
    show(fig, lv, note=f"Postings per level: junior {n.get('junior', 0)}, mid {n.get('mid', 0)}, senior {n.get('senior', 0)} "
                       "(the rest don't state a level).")

elif page == PAGES[2]:  # Salary
    st.caption(f"Advertised salaries only (median of the listed range, per year). Main model: {meta['salaried_postings_main_model']} "
               "Data Analyst jobs posted within the last year. Only ~15% of Indian job ads list a salary, and big companies rarely do.")
    st.subheader("Which skills go with higher pay? (same experience level and city)")
    e = csv("salary_effects.csv")
    main = e[e["model"].str.startswith("main") & e["pct_effect"].notna()].sort_values("pct_effect")
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=main["pct_effect"] / 100, y=main["skill"], mode="markers",
        error_x=dict(type="data", symmetric=False, array=(main["pct_high"] - main["pct_effect"]) / 100,
                     arrayminus=(main["pct_effect"] - main["pct_low"]) / 100, color=LIGHT_GRAY, thickness=2, width=0),
        marker=dict(size=12, color=[BLUE if v > 0 else RED for v in main["pct_effect"]], line=dict(color="#fcfcfb", width=2)),
        customdata=main[["pct_low", "pct_high", "postings_with_skill"]],
        hovertemplate="<b>%{y}</b>: %{x:+.0%}<br>95% range %{customdata[0]:+.0f}% to %{customdata[1]:+.0f}%"
                      "<br>%{customdata[2]} salaried jobs have it<extra></extra>"))
    fig.add_vline(x=0, line_color=GRAY)
    fig = style(fig, 420, legend=False)
    fig.update_xaxes(tickformat="+.0%", title_text="Pay difference vs jobs without the skill")
    show(fig, e, "Dot = best estimate. Grey line = 95% range. If the line crosses 0, we can't be sure the skill "
                 "changes pay. The table has the 3 robustness checks (all ages, without monthly-converted salaries, no controls).")

    c = st.columns(2)
    with c[0]:
        st.subheader("Salary distribution")
        dist = csv("salary_distribution.csv")
        who = st.segmented_control("Population", ["Data Analyst", "All analyst roles"], default="All analyst roles")
        col = "data_analyst" if who == "Data Analyst" else "all_analyst_roles"
        fig = go.Figure(go.Bar(x=dist["band"], y=dist[col], marker_color=BLUE, marker_line_width=0,
                               hovertemplate="%{x}: %{y} jobs<extra></extra>"))
        fig = style(fig, 340, legend=False)
        fig.update_yaxes(title_text="Salaried jobs")
        fig.update_xaxes(title_text="Advertised yearly salary (₹ lakh)")
        show(fig, dist)
    with c[1]:
        st.subheader("Median salary by company type")
        bt = csv("salary_by_company_type.csv")
        bt = bt[bt["salaried_postings"] >= 5]
        bt["label"] = bt["company_type"] + " (n=" + bt["salaried_postings"].astype(str) + ")"
        fig = hbar(bt, "median", "label", money=True, xtitle="Median advertised salary (₹ lakh / year)")
        show(fig, bt, "All analyst roles. Types with fewer than 5 salaried jobs are hidden.")

elif page == PAGES[3]:  # Job types
    st.caption(f"We let a clustering algorithm (k-means) sort {meta['postings']:,} Data Analyst jobs into 6 groups by the "
               f"skills they ask for, then named each group. Separation score {meta['job_type_separation_score']} "
               "(jobs blend into each other, so these are typical profiles, not rigid boxes).")
    types = csv("job_types.csv")
    pay = csv("job_type_pay.csv").set_index("job_type")
    c = st.columns(2)
    with c[0]:
        st.subheader("How common is each type?")
        show(donut(types["job_type"], types["postings"], colors=JOB_TYPE_COLORS))
    with c[1]:
        st.subheader("Tools listed vs pay")
        t = types.assign(pay=types["job_type"].map(pay["pct_vs_bi_dashboard"]) / 100,
                         n=types["job_type"].map(pay["salaried_postings"]))
        fig = go.Figure(go.Scatter(
            x=t["avg_skills_listed"], y=t["pay"], mode="markers+text", text=t["job_type"],
            # label positions chosen so neighbouring names never overlap
            textposition=[{"Python + SQL analyst": "bottom center", "BI / dashboard analyst": "bottom center"}.get(j, "top center")
                          for j in t["job_type"]],
            marker=dict(size=14, color=BLUE, line=dict(color="#fcfcfb", width=2)), customdata=t["n"],
            hovertemplate="<b>%{text}</b><br>%{x:.1f} skills listed on average<br>pay %{y:+.0%} vs BI/dashboard"
                          "<br>%{customdata} salaried jobs<extra></extra>"))
        fig.update_traces(cliponaxis=False)
        fig = style(fig, 340, legend=False)
        fig.update_layout(margin=dict(l=10, r=60, t=40, b=10))
        fig.update_xaxes(title_text="Average number of skills a job lists",
                         range=[t["avg_skills_listed"].min() - 1.2, t["avg_skills_listed"].max() + 1.2])
        fig.update_yaxes(range=[t["pay"].min() - 0.2, t["pay"].max() + 0.25])
        fig.update_yaxes(tickformat="+.0%", title_text="Pay vs BI/dashboard type")
        show(fig, pay.reset_index(), "Pay compared at the same experience level and city. Few salaried jobs per type, "
                                     "so treat exact sizes as rough.")
    st.subheader("What each type asks for")
    prof = types.set_index("job_type")[[c for c in types.columns if c.startswith("share_")]]
    prof.columns = [c.replace("share_", "") for c in prof.columns]
    fig = px.imshow(prof, color_continuous_scale=SEQUENTIAL, text_auto=".0%", aspect="auto", labels=dict(x="", y="", color=""))
    fig.update_traces(hovertemplate="%{y} · %{x}: %{z:.0%}<extra></extra>")
    show(style(fig, 360, legend=False), types)

elif page == PAGES[4]:  # Cities
    cd = csv("city_demand.csv").replace({"city": {"Other": "Other cities"}})
    c = st.columns(2)
    with c[0]:
        st.subheader("Where are the jobs?")
        known = cd[~cd["city"].isin(["Unknown"])]
        show(hbar(known, "all_analyst_postings", "city", fmt=",", xtitle="Analyst job postings"), cd,
             f"{int(cd.loc[cd.city == 'Unknown', 'all_analyst_postings'].sum()):,} postings only say 'India' (not shown).")
    with c[1]:
        st.subheader("Which city pays more?")
        cp = csv("city_salary.csv").replace({"city": {"Other": "Other cities"}})
        cp = cp[cp["enough_data"] & (cp["city"] != "Unknown")]
        cp["label"] = cp["city"] + " (n=" + cp["salaried_postings"].astype(str) + ")"
        fig = hbar(cp, "median", "label", money=True, xtitle="Median advertised salary (₹ lakh / year)")
        show(fig, csv("city_salary.csv"), "All analyst roles with a listed salary. Cities with under 10 salaried jobs "
                                          "are hidden. 'n' = salaried jobs, so small n means rough numbers.")
    st.subheader("Which city asks for which skills?")
    cs = csv("city_skills.csv").set_index("city")
    counts = cs.pop("postings")
    cs.index = [f"{c} ({n})" for c, n in counts.items()]
    fig = px.imshow(cs, color_continuous_scale=SEQUENTIAL, text_auto=".0%", aspect="auto", labels=dict(x="", y="", color=""))
    fig.update_traces(hovertemplate="%{y} · %{x}: %{z:.0%} of jobs<extra></extra>")
    show(style(fig, 380, legend=False), cs.reset_index(names="city"), "Data Analyst jobs; cities with 30+ jobs. Number in brackets = jobs.")

elif page == PAGES[5]:  # Companies & industries
    c = st.columns(2)
    with c[0]:
        st.subheader("Top hiring companies")
        top = csv("top_companies.csv")
        show(hbar(top, "postings", "company", fmt=",", xtitle="Analyst job postings"), top)
    with c[1]:
        st.subheader("Hiring by industry")
        mix = csv("company_type_mix.csv")
        labelled = mix[~mix["company_type"].isin(["Unlabelled", "Anonymous"])].sort_values("postings", ascending=False)
        top5 = labelled.head(5)
        rest = labelled.iloc[5:]["postings"].sum()
        show(donut(list(top5["company_type"]) + ["Other types"], list(top5["postings"]) + [rest]), mix,
             "Only the top ~60 companies are labelled by hand; the rest are 'Unlabelled' (see table).")
    st.subheader("Which cloud does each industry want?")
    ct = csv("company_types.csv")
    cloud = ct.melt(id_vars="company_type", value_vars=["share_Azure", "share_AWS"], var_name="cloud", value_name="share")
    cloud["cloud"] = cloud["cloud"].str.replace("share_", "")
    fig = px.bar(cloud, x="company_type", y="share", color="cloud", barmode="group", color_discrete_sequence=[BLUE, ORANGE])
    fig.update_traces(hovertemplate="%{x}: %{y:.0%}<extra></extra>", marker_line_width=0)
    fig = style(fig, 360)
    fig.update_yaxes(tickformat=".0%", title_text="Share of Data Analyst jobs")
    fig.update_xaxes(title_text="")
    show(fig, ct[["company_type", "postings", "share_Azure", "share_AWS"]])
    st.subheader("Skill profile by industry")
    prof = ct.set_index("company_type")[[c for c in ct.columns if c.startswith("share_") and c != "share_product_pattern"]]
    prof.columns = [c.replace("share_", "") for c in prof.columns]
    fig = px.imshow(prof, color_continuous_scale=SEQUENTIAL, text_auto=".0%", aspect="auto", labels=dict(x="", y="", color=""))
    fig.update_traces(hovertemplate="%{y} · %{x}: %{z:.0%}<extra></extra>")
    show(style(fig, 360, legend=False), ct,
         "Our starting hypothesis (IT services want many tools; product companies want SQL + one viz tool + communication) "
         "was NOT supported: IT services list an average number of skills, and the product pattern is equally common everywhere.")

elif page == PAGES[6]:  # Fresher reality
    mix = csv("experience_mix.csv")
    c = st.columns(2)
    with c[0]:
        st.subheader("Experience level of Data Analyst jobs")
        show(donut(mix["experience_level"].str.title(), mix["postings"]), mix,
             "Level from the job title first (Junior, Senior, Lead...), otherwise from years mentioned.")
    with c[1]:
        st.subheader("Years of experience asked for")
        yrs = csv("experience_years.csv")
        fig = go.Figure(go.Bar(x=yrs["years_required"], y=yrs["postings"], marker_color=BLUE, marker_line_width=0,
                               hovertemplate="%{x}: %{y} jobs<extra></extra>"))
        fig = style(fig, 340, legend=False)
        fig.update_yaxes(title_text="Jobs")
        show(fig, yrs, f"Only where the ad states years: {yrs['coverage_note'].iloc[0]}.")
    st.subheader("What do junior jobs ask for (vs all jobs)?")
    fr = csv("fresher_skills.csv").sort_values("junior_share", ascending=False)
    long = fr.melt(id_vars="skill", value_vars=["junior_share", "all_share"], var_name="who", value_name="share")
    long["who"] = long["who"].map({"junior_share": "Junior jobs", "all_share": "All Data Analyst jobs"})
    fig = px.bar(long, x="skill", y="share", color="who", barmode="group", color_discrete_sequence=[BLUE, LIGHT_GRAY])
    fig.update_traces(hovertemplate="%{x}: %{y:.0%}<extra></extra>", marker_line_width=0)
    fig = style(fig, 380)
    fig.update_yaxes(tickformat=".0%", title_text="Share of jobs")
    fig.update_xaxes(title_text="")
    show(fig, fr, f"Based on {int(fr['junior_postings'].iloc[0])} junior Data Analyst jobs, a small sample.")

elif page == PAGES[7]:  # AI, work mode, education
    st.caption("From Adzuna's full-text search on Data Analyst jobs (the words are usually in the part of the ad we can't see).")
    c = st.columns(2)
    with c[0]:
        st.subheader("Remote, hybrid or not stated?")
        wm = csv("work_mode.csv")
        show(donut(wm["work_mode"], wm["postings"]), wm, "'Not stated' usually means on-site, but we can't be sure, so we don't guess.")
    with c[1]:
        st.subheader("How much do AI and automation show up?")
        ai = csv("ai_demand.csv")
        show(hbar(ai, "share", "term", xtitle="Share of Data Analyst jobs mentioning it"), ai)
    st.subheader("Education mentioned")
    ed = csv("education.csv")
    show(hbar(ed, "share", "requirement", height=200, xtitle="Share of Data Analyst jobs"), ed)

elif page == PAGES[8]:  # Market trends
    tr = csv("trends.csv")
    st.caption("Trends grow with every collection run. With only a few runs so far, treat these as early signals.")
    c = st.columns(2)
    with c[0]:
        st.subheader("Open analyst postings per collection run")
        fig = go.Figure(go.Scatter(x=tr["date"], y=tr["open_postings"], mode="lines+markers",
                                   line=dict(color=BLUE, width=2), marker=dict(size=9),
                                   hovertemplate="%{x}: %{y:,} open postings<extra></extra>"))
        fig = style(fig, 340, legend=False)
        fig.update_yaxes(rangemode="tozero", title_text="Open postings")
        fig.update_xaxes(type="category", title_text="Collection run")
        show(fig, tr)
    with c[1]:
        st.subheader("How fresh are the open postings?")
        fr = csv("freshness.csv")
        fig = go.Figure(go.Bar(x=fr["posted"], y=fr["postings"], marker_color=BLUE, marker_line_width=0,
                               hovertemplate="%{x}: %{y:,}<extra></extra>"))
        fig = style(fig, 340, legend=False)
        fig.update_yaxes(title_text="Open postings")
        show(fig, fr, "Postings over a year old are mostly never-expiring recruiter ads; the salary analysis "
                      "uses postings under a year old.")
    churn = tr.dropna(subset=["new_since_previous"])
    if len(churn):
        st.subheader("Churn between runs")
        long = churn.melt(id_vars="date", value_vars=["new_since_previous", "gone_since_previous"], var_name="k", value_name="n")
        long["k"] = long["k"].map({"new_since_previous": "New postings", "gone_since_previous": "Postings gone"})
        fig = px.bar(long, x="date", y="n", color="k", barmode="group", color_discrete_sequence=[BLUE, ORANGE])
        fig.update_traces(hovertemplate="%{x}: %{y:,}<extra></extra>", marker_line_width=0)
        fig = style(fig, 300)
        fig.update_xaxes(title_text="", type="category")
        fig.update_yaxes(title_text="Postings")
        show(fig, churn)

elif page == PAGES[9]:  # Explorer
    ex = csv("explorer.csv")
    skills = list(meta["skills"].values())
    st.caption("Filter the Data Analyst jobs by profile and see what that slice of the market looks like. "
               "(De-identified: no job titles, companies or text.)")
    f = st.columns(4)
    cities = f[0].multiselect("City", sorted(ex["city"].unique()))
    levels = f[1].multiselect("Experience level", ["junior", "mid", "senior", "unspecified"])
    ctypes = f[2].multiselect("Company type", sorted(ex["company_type"].unique()))
    need = f[3].multiselect("Must mention ALL of these skills", skills)
    sub = ex.copy()
    if cities:
        sub = sub[sub["city"].isin(cities)]
    if levels:
        sub = sub[sub["experience_level"].isin(levels)]
    if ctypes:
        sub = sub[sub["company_type"].isin(ctypes)]
    for s in need:
        sub = sub[sub[s] == 1]
    m = st.columns(4)
    m[0].metric("Matching jobs", f"{len(sub):,}")
    m[0].caption(f"{len(sub) / len(ex):.0%} of all Data Analyst jobs")
    m[1].metric("With a listed salary", f"{sub['salary_lakh'].notna().sum():,}")
    m[2].metric("Median salary", "–" if sub["salary_lakh"].notna().sum() < 5 else f"₹{sub['salary_lakh'].median():.1f}L",
                help="Shown only with 5+ salaried jobs")
    m[3].metric("Mention remote/WFH", pct(sub["remote_mentioned"].mean()) if len(sub) else "–")
    if len(sub) >= 10:
        prof = pd.DataFrame({"skill": skills, "share": sub[skills].mean().values})
        c = st.columns(2)
        with c[0]:
            st.subheader("Skills in this slice")
            show(hbar(prof, "share", "skill", xtitle="Share of matching jobs"))
        with c[1]:
            st.subheader("Job types in this slice")
            jt = sub["job_type"].value_counts()
            show(donut(jt.index, jt.values, colors=JOB_TYPE_COLORS))
    else:
        st.warning("Fewer than 10 matching jobs: widen the filters to see a profile.")

else:  # About & method
    st.markdown(f"""
**The question:** which skills matter most for Data Analyst jobs in India, and which go with higher pay?

**The pipeline:** collect (Adzuna API + public company job boards, weekly) → store raw → SQL database →
clean (salary units, experience level, city, company names) → analyse (demand, regression, clustering) → this dashboard.

**Data window:** {meta['data_window']['first_run'][:10]} to {meta['data_window']['last_run'][:10]}
({meta['data_window']['runs']} collection runs). Population: {meta['population']}.

**Methods, in one line each**
- *Skill demand:* share of postings mentioning each skill. Adzuna only returns 500 characters per ad, but it searches the full
  text, so each skill is one full-text query (in the first 500 characters SQL appears in only ~6% of ads; in full text, 68%).
- *Salary:* regression of log(advertised salary) on skills, holding experience level and city fixed; robust errors; 3 robustness
  checks. "Leans higher/lower" = same direction in all 4 versions; "certain" = 95% range excludes zero.
- *Job types:* k-means clustering (k = 6) on each job's skill profile.

**Limits, stated plainly**
- Only ~15% of ads list a salary, and big employers rarely do, so salary results mostly describe smaller companies and startups.
- Salary effects are associations in advertised pay, not proof that a skill *causes* higher pay.
- Rare skills (AWS, Azure, ML, GenAI, A/B testing) have too few salaried jobs to measure pay.
- Trends need more collection runs.

**Data credit:** job and salary data from [The Adzuna API](https://www.adzuna.in), used for personal research. No individual
listings are published: this dashboard shows aggregated results and a de-identified table only.

Every decision and its reasoning is logged in `DECISIONS.md` in the project repository.
""")
