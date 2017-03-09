.PHONY: test

NAME = $(shell node -e "console.log(require('./package.json').name)")

install: all
	npm install -g .

reinstall: clean
	$(MAKE) uninstall
	$(MAKE) install

uninstall:
	npm uninstall -g ${NAME}

dev-install: package.json
	npm install .

publish: all test
	git push --tags origin HEAD:master
	npm publish
