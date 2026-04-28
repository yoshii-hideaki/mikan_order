.PHONY: dev stop restart open install build db-push

PID_FILE := /tmp/mikan-order.pid
LOG_FILE := /tmp/mikan-order.log

dev:
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "Already running (PID: $$(cat $(PID_FILE)))"; \
	else \
		npm run dev > $(LOG_FILE) 2>&1 & echo $$! > $(PID_FILE); \
		sleep 3; \
		echo "Started (PID: $$(cat $(PID_FILE))) — http://localhost:3001"; \
	fi

stop:
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		kill $$(cat $(PID_FILE)) && rm -f $(PID_FILE); \
		echo "Stopped"; \
	else \
		echo "Not running"; \
		rm -f $(PID_FILE); \
	fi

restart: stop dev

open:
	@open http://localhost:3001

log:
	@tail -f $(LOG_FILE)

install:
	npm install

build:
	npm run build

db-push:
	npm run db:push
