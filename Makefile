.PHONY: install test example check pack

install:
	npm install --omit=optional

test:
	npm test

example:
	npm run build:example

check:
	npm run check

pack:
	npm pack --dry-run
