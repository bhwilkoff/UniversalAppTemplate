# humanshaped.org

This branch is the website for humanshaped.org, the home of the course
on building human-shaped software with AI. It is served by GitHub Pages
from the root of this branch.

It is an orphan branch on purpose. It shares no history or files with
`main`, which is the Universal App Template. When someone makes an app
from the template, GitHub copies only `main`, so this site, its domain,
and anything built here for course sign-ups stay out of their copy.

**Work on it beside main** with a worktree:

    git worktree add ../humanshaped-site site

**Never commit** sign-up data, student names or emails, or any keys.
Those belong in the sign-up service, not in a public repository.
