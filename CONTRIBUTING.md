# Contributing

Thanks for your interest in contributing to The Kitchen Organiser! This guide will help you get set up and explain how we work.

## Getting Started

### Prerequisites

- macOS (the app uses macOS-specific features like launchd)
- Python 3.12
- [Anaconda](https://www.anaconda.com/) or [Miniconda](https://docs.conda.io/en/latest/miniconda.html)

### Setup

```bash
# Clone the repository
git clone https://github.com/majorpayne-2021/the-kitchen-organiser.git
cd the-kitchen-organiser

# Create and activate the conda environment
conda env create -f environment.yml
conda activate recipes

# Launch the app
python app.py
```

The app runs at **http://localhost:8080**. On first launch, the database is created automatically with 5 sample recipes.

## Project Layout

| File/Folder | Purpose |
|-------------|---------|
| `app.py` | All Flask routes and request handlers |
| `helpers.py` | Ingredient parsing, grocery aggregation, recipe search |
| `schema.sql` | SQLite database schema |
| `seed.py` | Sample recipe data for fresh installs |
| `static/style.css` | All styling |
| `templates/` | Jinja2 HTML templates |

## Making Changes

### Branch Naming

Create a branch from `main` with a descriptive name:

```bash
git checkout -b add-recipe-tags-filter
git checkout -b fix-grocery-list-duplicates
```

Use prefixes that describe the type of change:
- `add-` for new features
- `fix-` for bug fixes
- `update-` for enhancements to existing features
- `refactor-` for code restructuring

### Code Style

- **Python** — follow [PEP 8](https://peps.python.org/pep-0008/) conventions
- **HTML templates** — use 4-space indentation, keep Jinja2 logic readable
- **CSS** — use the existing CSS custom properties (variables) defined at the top of `style.css` rather than hardcoding colours or fonts
- **SQL** — use uppercase for keywords (`SELECT`, `INSERT`), lowercase for table and column names

### Database Changes

If your change requires a schema update:

1. Add the new table or column to `schema.sql`
2. Update `seed.py` if the sample recipes need to use the new schema
3. Note the migration steps in your pull request description

### Commits

Write clear commit messages that explain **why**, not just what:

```
# Good
Fix grocery list combining items with different units

# Less helpful
Update helpers.py
```

### Pull Requests

1. Push your branch and open a pull request against `main`
2. Include a short summary of what the change does and why
3. Add screenshots if the change affects the UI
4. Make sure the app runs without errors before submitting

## Reporting Bugs

Open a [GitHub issue](https://github.com/majorpayne-2021/the-kitchen-organiser/issues) with:

- What you expected to happen
- What actually happened
- Steps to reproduce the problem
- Browser and OS version

## Suggesting Features

Feature ideas are welcome! Open a [GitHub issue](https://github.com/majorpayne-2021/the-kitchen-organiser/issues) and describe:

- The problem you're trying to solve
- How you'd like it to work
- Any alternatives you've considered
