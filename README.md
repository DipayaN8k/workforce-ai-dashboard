# WorkForce AI: Data Analyst Job Market Dashboard (India)

An interactive dashboard showing which skills Indian Data Analyst job postings ask for,
which skills go with higher advertised pay, the 6 types of Data Analyst jobs, city and
industry differences, AI and work-mode demand, and more.

**Built by Dipayan & Sayak.** We collected the job postings ourselves, then cleaned,
analysed (regression, k-means clustering) and visualised them.

This repository contains **only the dashboard and aggregated results**. The data
pipeline (collection, SQL database, cleaning, analysis) lives in our main project repository.

## Run it locally
```bash
pip install -r requirements.txt
streamlit run dashboard/app.py
```

## Data credit
Job and salary data: **[The Adzuna API](https://www.adzuna.in)**, used for personal
research. No individual job listings are published here: only aggregated statistics and
a de-identified table (no titles, companies, text or links).
