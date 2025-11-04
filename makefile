.PHONY: help build up down restart logs test test-cov lint format clean

help:
	@echo "Доступные команды:"
	@echo "  rebuild-up        - Остановить, сбилдить, запустить"
	@echo "  make build        - Собрать Docker образы"
	@echo "  make up           - Запустить все сервисы"
	@echo "  make down         - Остановить все сервисы"
	@echo "  make restart      - Перезапустить сервисы"
	@echo "  make clean        - Очистить временные файлы"

build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Services start at http://localhost:8000"

down:
	docker-compose down

restart:
	docker-compose restart

rebuild-up:
	docker-compose down
	docker-compose build
	docker-compose up -d
 	@echo "Servives rebuilded and start at http://localhost:8000"


