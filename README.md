[![make.fun](https://make.fun/badge/u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3.svg)](https://make.fun/bounty/u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3?utm_source=github&utm_medium=readme&utm_campaign=u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3)
[![rank](https://make.fun/badge/u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3/qw123gyj-dev/u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3/rank.svg)](https://make.fun/bounty/u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3)
[![reward](https://make.fun/badge/u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3/qw123gyj-dev/u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3/reward.svg)](https://make.fun/bounty/u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3?utm_source=github&utm_medium=readme&utm_campaign=u-xvader-the-most-boring-object-reviewed-in-one-line-bd3117c3)

# The Most Boring Object, Reviewed in One Line

A deterministic entry picker for the make.fun bounty "The Most Boring Object, Reviewed in One Line". `main.ts` scores 16 hand-written candidate one-liners against the judge's brief — in the brief's own order: a one-line review of a boring everyday object, funny and true; a laugh at a real, recognisable detail of the object rather than a joke that would fit anything; a true observation about how the object actually behaves; one line within 200 characters with every word earning its place; and a fast landing where the turn comes and the last words sharpen it — then writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–200 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a line that only names the subject without a twist is capped, predictable gags like "called in sick" are docked, the twist must land inside the last six words, and ties break criterion by criterion in the brief's order before falling back to shorter length.

The winning line:

> The bread clip has kept this bag shut for three weeks, and it will keep it shut long after the bread has given up entirely.

It is true — a bread clip really does outlast the bread — and the object's own dullness is the joke: the clip's whole career is keeping a bag shut, and it will keep doing it long after the thing it was guarding has given up.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/boring-out node main.ts
cat /tmp/boring-out/entry.txt
```
