BUILD_DIR = ./dist
BUILDER = @./node_modules/.bin/webmake
BUILD = $(BUILD_DIR)/hawk
MINIFY = @./node_modules/.bin/uglifyjs 

webclient: commonjs amd
	
commonjs:
	@echo "Building CommonJS module"
	$(BUILDER) --name hawk.client ./index.js $(BUILD).js
	$(MINIFY) $(BUILD).js -c -m > $(BUILD).min.js
	@gzip -9 $(BUILD).min.js -c > $(BUILD).js.gz

amd: 
	@echo "Building AMD module"
	$(BUILDER) --name hawk.client ./index.js --amd $(BUILD)-amd.js
	$(MINIFY) $(BUILD)-amd.js -c -m > $(BUILD)-amd.min.js
	@gzip -9 $(BUILD)-amd.min.js -c > $(BUILD)-amd.js.gz


REPORTER = dot

test: 
	@#lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive --reporter $(REPORTER) --ignore-leaks --timeout 3000
	@#$(MAKE) rm-lib-cov

tests: test

lib-cov: rm-lib-cov
	@jscoverage lib lib-cov

rm-lib-cov:
	@rm -rf ./lib-cov/

test-cov: lib-cov
	@$(MAKE) test TEST_COV=1 REPORTER=json-cov > coverage.json
	@$(MAKE) rm-lib-cov

test-cov-html: lib-cov
	@$(MAKE) test TEST_COV=1 REPORTER=html-cov > coverage.html
	@$(MAKE) rm-lib-cov

tap: lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha -R tap > results.tap
	@$(MAKE) rm-lib-cov

unit: 
	@#lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive -R xunit --ignore-leaks > results.xml --timeout 3000
	@#$(MAKE) rm-lib-cov

.PHONY: test tap test-cov test-cov-html unit lib-cov rm-lib-cov